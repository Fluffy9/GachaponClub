// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/Machine.sol";
import "../src/Gacha.sol";
import "./MockPrizeNFT.sol";
import "./MockPrizeERC721.sol";
import "./mocks/TestHelpers.sol";
import "./mocks/VRFCoordinatorV2PlusMock.sol";

contract MachinePlayTest is Test {
    GachaMachine public machine;
    VRFCoordinatorV2PlusMock public vrf;
    GachaNFT public capsule;
    MockPrizeNFT public prize1155;
    MockPrizeERC721 public prize721;

    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user = makeAddr("user");
    address public other = makeAddr("other");

    uint256 public constant COMMON = 0;
    uint256 public constant TOKEN_ID = 42;
    uint256 public constant PRICE = 0.01 ether;

    event PlayRequested(uint256 indexed requestId, address indexed player, uint256 indexed rarityId);
    event PrizeDrawn(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed rarityId,
        address tokenContract,
        uint256 tokenId,
        uint256 amount,
        bool isERC721
    );
    event PrizeClaimed(address indexed player, address tokenContract, uint256 tokenId, uint256 amount, bool isERC721);
    event CapsuleRefunded(uint256 indexed requestId, address indexed player, uint256 indexed rarityId);

    function setUp() public {
        vm.startPrank(owner);
        vrf = new VRFCoordinatorV2PlusMock();
        machine = new GachaMachine(MachineHarness.vrfConfig(address(vrf)));
        capsule = new GachaNFT();
        prize1155 = new MockPrizeNFT();
        prize721 = new MockPrizeERC721();

        machine.grantRole(machine.ADMIN_ROLE(), admin);
        capsule.grantRole(capsule.MINTER_ROLE(), address(machine));
        prize1155.grantRole(prize1155.MINTER_ROLE(), admin);
        prize721.grantRole(prize721.MINTER_ROLE(), admin);
        vm.stopPrank();

        vm.startPrank(admin);
        machine.registerRarity(address(capsule), "Common", PRICE);
        machine.approveNFT(COMMON, address(prize1155), true);
        machine.approveNFT(COMMON, address(prize721), true);
        vm.stopPrank();
    }

    function _donate1155(uint256 tokenId, uint256 amount) internal {
        vm.prank(admin);
        prize1155.mint(other, tokenId, amount);
        vm.startPrank(other);
        prize1155.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prize1155), tokenId, amount, COMMON);
        vm.stopPrank();
    }

    function _buyAndApproveCapsule() internal {
        vm.deal(user, 1 ether);
        vm.startPrank(user);
        machine.purchase{value: PRICE}(COMMON);
        capsule.setApprovalForAll(address(machine), true);
        vm.stopPrank();
    }

    function _play() internal returns (uint256 requestId) {
        vm.prank(user);
        requestId = machine.play(COMMON);
    }

    // -------------------------------------------------------------------------
    // play
    // -------------------------------------------------------------------------

    function test_play_burnsCapsuleAndRequestsVrf() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();

        vm.expectEmit(true, true, true, true);
        emit PlayRequested(1, user, COMMON);

        uint256 requestId = _play();

        assertEq(requestId, 1);
        assertEq(capsule.balanceOf(user, COMMON), 0);
        assertEq(machine.getPrizeCount(COMMON), 1);
        assertEq(machine.pendingDraws(COMMON), 1);
        assertEq(machine.getAvailablePrizeCount(COMMON), 0);
        (address player, uint256 rarityId, bool fulfilled, , uint64 bagLength) = machine.draws(requestId);
        assertEq(player, user);
        assertEq(rarityId, COMMON);
        assertFalse(fulfilled);
        assertEq(bagLength, 1);
    }

    function test_play_revertsWithoutPrize() public {
        _buyAndApproveCapsule();
        vm.prank(user);
        vm.expectRevert("No prizes available");
        machine.play(COMMON);
    }

    function test_play_revertsWithoutCapsule() public {
        _donate1155(TOKEN_ID, 1);
        vm.prank(user);
        capsule.setApprovalForAll(address(machine), true);
        vm.prank(user);
        vm.expectRevert("ERC1155: burn amount exceeds balance");
        machine.play(COMMON);
    }

    function test_play_revertsWithoutApproval() public {
        _donate1155(TOKEN_ID, 1);
        vm.deal(user, 1 ether);
        vm.prank(user);
        machine.purchase{value: PRICE}(COMMON);

        vm.prank(user);
        vm.expectRevert("ERC1155: caller is not token owner or approved");
        machine.play(COMMON);
    }

    function test_play_revertsIfRarityDisabled() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        vm.prank(admin);
        machine.setRarityEnabled(COMMON, false);

        vm.prank(user);
        vm.expectRevert("Rarity not enabled");
        machine.play(COMMON);
    }

    function test_play_revertsWhenAllPrizesReserved() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        _play();

        vm.deal(other, 1 ether);
        vm.startPrank(other);
        machine.purchase{value: PRICE}(COMMON);
        capsule.setApprovalForAll(address(machine), true);
        vm.expectRevert("No prizes available");
        machine.play(COMMON);
        vm.stopPrank();
    }

    function test_setVRFConfig_revertsCoordinatorChange() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();

        GachaMachine.VRFConfig memory cfg = MachineHarness.vrfConfig(address(0));
        vm.prank(admin);
        vm.expectRevert("Coordinator locked");
        machine.setVRFConfig(cfg);

        vm.prank(user);
        machine.play(COMMON);
    }

    function test_play_revertsIfNoSubscription() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();

        GachaMachine.VRFConfig memory cfg = MachineHarness.vrfConfig(address(vrf));
        cfg.subscriptionId = 0;
        vm.prank(admin);
        machine.setVRFConfig(cfg);

        vm.prank(user);
        vm.expectRevert("No subscription");
        machine.play(COMMON);
    }

    function test_setVRFConfig_revertsZeroCallbackGas() public {
        GachaMachine.VRFConfig memory cfg = MachineHarness.vrfConfig(address(vrf));
        cfg.callbackGasLimit = 0;
        vm.prank(admin);
        vm.expectRevert("Invalid callback gas");
        machine.setVRFConfig(cfg);
    }

    function test_setVRFConfig_revertsWhilePendingDraws() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        _play();

        GachaMachine.VRFConfig memory cfg = MachineHarness.vrfConfig(address(vrf));
        vm.prank(admin);
        vm.expectRevert("Pending draws");
        machine.setVRFConfig(cfg);
    }

    function test_redeemPrize_respectsPendingDraws() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        _play();

        vm.prank(admin);
        vm.expectRevert("No prizes available");
        machine.redeemPrize(COMMON, admin);
    }

    // -------------------------------------------------------------------------
    // fulfill + claim
    // -------------------------------------------------------------------------

    function test_fulfill_swapRemovesAndClaimTransfers() public {
        _donate1155(TOKEN_ID, 1);
        _donate1155(TOKEN_ID + 1, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();

        vm.expectEmit(true, true, true, true);
        emit PrizeDrawn(requestId, user, COMMON, address(prize1155), TOKEN_ID, 1, false);

        vrf.fulfill(requestId, 0);

        assertEq(machine.getPrizeCount(COMMON), 1);
        assertEq(machine.pendingDraws(COMMON), 0);
        assertEq(machine.getClaimCount(user), 1);
        GachaMachine.PrizeClaim memory queued = machine.getClaim(user, 0);
        assertEq(queued.tokenContract, address(prize1155));
        assertEq(queued.tokenId, TOKEN_ID);
        assertEq(prize1155.balanceOf(address(machine), TOKEN_ID), 1);
        assertEq(prize1155.balanceOf(user, TOKEN_ID), 0);

        vm.expectEmit(true, false, false, true);
        emit PrizeClaimed(user, address(prize1155), TOKEN_ID, 1, false);

        vm.prank(user);
        machine.claim(0);

        assertEq(prize1155.balanceOf(user, TOKEN_ID), 1);
        assertEq(prize1155.balanceOf(address(machine), TOKEN_ID), 0);
        assertEq(machine.getClaimCount(user), 0);
        assertEq(machine.getPrizeInfo(COMMON, 0).tokenId, TOKEN_ID + 1);
    }

    function test_fulfill_picksLastIndex() public {
        _donate1155(TOKEN_ID, 1);
        _donate1155(TOKEN_ID + 1, 1);
        _donate1155(TOKEN_ID + 2, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();

        vrf.fulfill(requestId, 2);

        GachaMachine.PrizeClaim memory queued = machine.getClaim(user, 0);
        assertEq(queued.tokenId, TOKEN_ID + 2);
    }

    function testFuzz_fulfill_indexIsWordModN(uint256 word, uint8 nRaw) public {
        uint256 n = bound(nRaw, 1, 8);
        for (uint256 i = 0; i < n; i++) {
            _donate1155(TOKEN_ID + i, 1);
        }
        _buyAndApproveCapsule();
        uint256 requestId = _play();

        vrf.fulfill(requestId, word);

        GachaMachine.PrizeClaim memory queued = machine.getClaim(user, 0);
        assertEq(queued.tokenId, TOKEN_ID + (word % n));
        assertEq(machine.getPrizeCount(COMMON), n - 1);
    }

    /// @dev Word 6 % 3 = 0 (first prize) but 6 % 4 = 2 (third prize). Donations
    ///      are blocked while a draw is pending, so that inflation cannot land.
    function test_donate_revertsWhileDrawPending() public {
        _donate1155(TOKEN_ID, 1);
        _donate1155(TOKEN_ID + 1, 1);
        _donate1155(TOKEN_ID + 2, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();

        vm.prank(admin);
        prize1155.mint(other, TOKEN_ID + 99, 1);
        vm.startPrank(other);
        prize1155.setApprovalForAll(address(machine), true);
        vm.expectRevert("Draws pending");
        machine.donateNFT(address(prize1155), TOKEN_ID + 99, 1, COMMON);
        vm.stopPrank();

        assertEq(machine.getPrizeCount(COMMON), 3);

        vrf.fulfill(requestId, 0);
        vm.startPrank(other);
        machine.donateNFT(address(prize1155), TOKEN_ID + 99, 1, COMMON);
        vm.stopPrank();
        assertEq(machine.getPrizeCount(COMMON), 3);
    }

    function test_fulfill_usesCurrentLengthIfBagShrunk() public {
        _donate1155(TOKEN_ID, 1);
        _donate1155(TOKEN_ID + 1, 1);
        _donate1155(TOKEN_ID + 2, 1);

        _buyAndApproveCapsule();
        uint256 first = _play();

        vm.deal(other, 1 ether);
        vm.startPrank(other);
        machine.purchase{value: PRICE}(COMMON);
        capsule.setApprovalForAll(address(machine), true);
        uint256 second = machine.play(COMMON);
        vm.stopPrank();

        (, , , , uint64 secondSnap) = machine.draws(second);
        assertEq(secondSnap, 3);

        vrf.fulfill(first, 0);
        // Snapshot is 3 and word 2 would be OOB on the length-2 bag if we
        // modulo'd the snapshot without capping to the current length.
        vrf.fulfill(second, 2);

        assertEq(machine.getClaim(user, 0).tokenId, TOKEN_ID);
        assertEq(machine.getClaim(other, 0).tokenId, TOKEN_ID + 2);
        assertEq(machine.getPrizeCount(COMMON), 1);
    }

    function test_fulfill_erc721Prize() public {
        vm.prank(admin);
        uint256 tokenId = prize721.mint(user);
        vm.startPrank(user);
        prize721.approve(address(machine), tokenId);
        machine.donateNFT(address(prize721), tokenId, 1, COMMON);
        vm.stopPrank();

        _buyAndApproveCapsule();
        uint256 requestId = _play();
        vrf.fulfill(requestId, 0);

        vm.prank(user);
        machine.claim(0);

        assertEq(prize721.ownerOf(tokenId), user);
        assertEq(machine.getPrizeCount(COMMON), 0);
    }

    function test_onlyCoordinatorCanFulfill() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();

        uint256[] memory words = new uint256[](1);
        words[0] = 0;
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(GachaMachine.OnlyCoordinatorCanFulfill.selector, user, address(vrf)));
        machine.rawFulfillRandomWords(requestId, words);
    }

    function test_doubleFulfill_isNoOp() public {
        _donate1155(TOKEN_ID, 1);
        _donate1155(TOKEN_ID + 1, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();

        vrf.fulfill(requestId, 0);
        vrf.fulfill(requestId, 1);

        assertEq(machine.getClaimCount(user), 1);
        assertEq(machine.getPrizeCount(COMMON), 1);
        assertEq(machine.getClaim(user, 0).tokenId, TOKEN_ID);
    }

    function test_strangerCannotClaim() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();
        vrf.fulfill(requestId, 0);

        vm.prank(other);
        vm.expectRevert("Invalid claim");
        machine.claim(0);
    }

    function test_twoPlaysGetDistinctPrizes() public {
        _donate1155(TOKEN_ID, 1);
        _donate1155(TOKEN_ID + 1, 1);

        _buyAndApproveCapsule();
        uint256 first = _play();

        vm.deal(other, 1 ether);
        vm.startPrank(other);
        machine.purchase{value: PRICE}(COMMON);
        capsule.setApprovalForAll(address(machine), true);
        uint256 second = machine.play(COMMON);
        vm.stopPrank();

        vrf.fulfill(first, 0);
        vrf.fulfill(second, 0);

        assertEq(machine.getClaim(user, 0).tokenId, TOKEN_ID);
        assertEq(machine.getClaim(other, 0).tokenId, TOKEN_ID + 1);

        vm.prank(user);
        machine.claim(0);
        vm.prank(other);
        machine.claim(0);

        assertEq(prize1155.balanceOf(user, TOKEN_ID), 1);
        assertEq(prize1155.balanceOf(other, TOKEN_ID + 1), 1);
    }

    function test_emptyWordsRefundsCapsule() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();

        vm.expectEmit(true, true, true, true);
        emit CapsuleRefunded(requestId, user, COMMON);

        vrf.fulfillEmpty(requestId);

        assertEq(machine.getPrizeCount(COMMON), 1);
        assertEq(machine.getClaim(user, 0).tokenContract, address(0));
        assertEq(machine.getClaim(user, 0).tokenId, COMMON);

        vm.prank(user);
        machine.claim(0);

        assertEq(capsule.balanceOf(user, COMMON), 1);
        assertEq(prize1155.balanceOf(address(machine), TOKEN_ID), 1);
    }

    function test_cannotWithdrawReservedPrize() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        _play();

        vm.prank(admin);
        vm.expectRevert("Prize reserved");
        machine.withdrawPrize(COMMON, 0, address(prize1155), TOKEN_ID, admin);
    }

    function test_claim_recordsAssignedAt() public {
        _donate1155(TOKEN_ID, 1);
        _buyAndApproveCapsule();
        uint256 requestId = _play();
        vrf.fulfill(requestId, 0);

        GachaMachine.PrizeClaim memory queued = machine.getClaim(user, 0);
        assertEq(queued.assignedAt, uint64(block.timestamp));
        assertEq(queued.tokenId, TOKEN_ID);

        vm.prank(user);
        machine.claim(0);
        assertEq(prize1155.balanceOf(user, TOKEN_ID), 1);
    }
}
