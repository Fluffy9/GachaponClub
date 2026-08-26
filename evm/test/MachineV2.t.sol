// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/Machine.sol";
import "../src/Gacha.sol";
import "./MockPrizeNFT.sol";
import "./MockPrizeERC721.sol";
import "./mocks/TestHelpers.sol";
import "./mocks/VRFCoordinatorV2PlusMock.sol";

contract MachineV2Test is Test {
    GachaMachine public machine;
    VRFCoordinatorV2PlusMock public vrf;
    GachaNFT public commonCap;
    GachaNFT public rareCap;
    MockPrizeNFT public prize;
    MockPrizeERC721 public prize721;

    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user = makeAddr("user");

    uint256 public constant COMMON = 0;
    uint256 public constant RARE = 1;
    uint256 public constant PRICE = 0.01 ether;
    uint256 public constant TOKEN_ID = 7;

    event DrawRescued(uint256 indexed requestId, address indexed player, uint256 indexed rarityId);
    event VRFSubscriptionCanceled(uint256 indexed subscriptionId, address indexed to);

    function setUp() public {
        vm.startPrank(owner);
        vrf = new VRFCoordinatorV2PlusMock();
        machine = new GachaMachine(MachineHarness.vrfConfig(address(vrf)));
        commonCap = new GachaNFT();
        rareCap = new GachaNFT();
        prize = new MockPrizeNFT();
        prize721 = new MockPrizeERC721();

        machine.grantRole(machine.ADMIN_ROLE(), admin);
        commonCap.grantRole(commonCap.MINTER_ROLE(), address(machine));
        rareCap.grantRole(rareCap.MINTER_ROLE(), address(machine));
        prize.grantRole(prize.MINTER_ROLE(), admin);
        prize721.grantRole(prize721.MINTER_ROLE(), admin);
        vm.stopPrank();

        vm.startPrank(admin);
        machine.registerRarity(address(commonCap), "Common", PRICE);
        machine.registerRarity(address(rareCap), "Rare", 0.05 ether);
        machine.approveNFT(COMMON, address(prize), true);
        machine.approveNFT(RARE, address(prize), true);
        machine.approveNFT(COMMON, address(prize721), true);
        machine.approveNFT(RARE, address(prize721), true);
        vm.stopPrank();
    }

    function test_donate_picksRareBagAndCapsule() public {
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);

        vm.startPrank(user);
        prize.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prize), TOKEN_ID, 1, RARE);
        vm.stopPrank();

        assertEq(machine.getPrizeCount(COMMON), 0);
        assertEq(machine.getPrizeCount(RARE), 1);
        assertEq(commonCap.balanceOf(user, 0), 0);
        assertEq(rareCap.balanceOf(user, 0), 1);
        assertEq(machine.getPrizeInfo(RARE, 0).tokenContract, address(prize));
    }

    function test_pause_blocksPurchasePlayDonate_claimStillWorks() public {
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        prize.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prize), TOKEN_ID, 1, COMMON);
        vm.stopPrank();

        vm.deal(user, 1 ether);
        vm.startPrank(user);
        machine.purchase{value: PRICE}(COMMON);
        commonCap.setApprovalForAll(address(machine), true);
        uint256 requestId = machine.play(COMMON);
        vm.stopPrank();

        vm.prank(admin);
        machine.pause();

        vm.prank(user);
        vm.expectRevert("Pausable: paused");
        machine.purchase{value: PRICE}(COMMON);

        vrf.fulfill(requestId, 0);
        vm.prank(user);
        machine.claim(0);
        assertEq(prize.balanceOf(user, TOKEN_ID), 1);
    }

    function test_playerRescue_afterDelay_refundsCapsule() public {
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        prize.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prize), TOKEN_ID, 1, COMMON);
        commonCap.setApprovalForAll(address(machine), true);
        uint256 requestId = machine.play(COMMON);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert("Too early");
        machine.rescueStuckDraw(requestId);

        vm.warp(block.timestamp + 1 days);
        vm.expectEmit(true, true, true, true);
        emit DrawRescued(requestId, user, COMMON);
        vm.prank(user);
        machine.rescueStuckDraw(requestId);

        assertEq(machine.pendingDraws(COMMON), 0);
        vm.prank(user);
        machine.claim(0);
        assertEq(commonCap.balanceOf(user, 0), 1);

        uint256[] memory words = new uint256[](1);
        words[0] = 0;
        vrf.fulfill(requestId, 0);
        assertEq(machine.getPrizeCount(COMMON), 1);
        assertEq(machine.getClaimCount(user), 0);
    }

    function test_adminRescue_skipsDelay() public {
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        prize.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prize), TOKEN_ID, 1, COMMON);
        commonCap.setApprovalForAll(address(machine), true);
        uint256 requestId = machine.play(COMMON);
        vm.stopPrank();

        vm.prank(admin);
        machine.rescueStuckDraw(requestId);
        assertEq(machine.pendingDraws(COMMON), 0);
    }

    function test_directERC1155TransferReverts() public {
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        vm.expectRevert("Direct transfer disabled");
        prize.safeTransferFrom(user, address(machine), TOKEN_ID, 1, "");
        vm.stopPrank();
    }

    function test_directERC721SafeTransferReverts() public {
        vm.prank(admin);
        uint256 tokenId = prize721.mint(user);
        vm.startPrank(user);
        vm.expectRevert("Direct transfer disabled");
        prize721.safeTransferFrom(user, address(machine), tokenId);
        vm.stopPrank();
    }

    function test_cancelVrfSubscription_sendsNativeAndBlocksPlay() public {
        GachaMachine owned = _machineWithOwnedSub();
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        prize.setApprovalForAll(address(owned), true);
        owned.donateNFT(address(prize), TOKEN_ID, 1, COMMON);
        vm.stopPrank();

        owned.fundVrf{value: 0.005 ether}();

        address recipient = makeAddr("vrfRefund");
        (,, uint256 subId,,,) = owned.vrfConfig();
        assertGt(subId, 0);

        vm.expectEmit(true, true, false, true, address(owned));
        emit VRFSubscriptionCanceled(subId, recipient);
        vm.prank(admin);
        owned.cancelVrfSubscription(recipient);

        assertEq(recipient.balance, 0.005 ether);
        assertEq(vrf.nativeBalance(subId), 0);
        (,, uint256 afterId,,,) = owned.vrfConfig();
        assertEq(afterId, 0);

        vm.startPrank(user);
        commonCap.setApprovalForAll(address(owned), true);
        vm.expectRevert("No subscription");
        owned.play(COMMON);
        vm.stopPrank();
    }

    function test_cancelVrfSubscription_revertsWhileDrawPending() public {
        GachaMachine owned = _machineWithOwnedSub();
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        prize.setApprovalForAll(address(owned), true);
        owned.donateNFT(address(prize), TOKEN_ID, 1, COMMON);
        commonCap.setApprovalForAll(address(owned), true);
        owned.play(COMMON);
        vm.stopPrank();

        vm.prank(admin);
        vm.expectRevert("Pending draws");
        owned.cancelVrfSubscription(admin);
    }

    function test_cancelVrfSubscription_revertsZeroRecipient() public {
        vm.prank(admin);
        vm.expectRevert("Invalid recipient");
        machine.cancelVrfSubscription(address(0));
    }

    function test_cancelVrfSubscription_revertsNonAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        machine.cancelVrfSubscription(user);
    }

    function test_cancelVrfSubscription_revertsWhenNoSub() public {
        GachaMachine.VRFConfig memory cfg = MachineHarness.vrfConfig(address(vrf));
        cfg.subscriptionId = 0;
        vm.prank(admin);
        machine.setVRFConfig(cfg);

        vm.prank(admin);
        vm.expectRevert("No subscription");
        machine.cancelVrfSubscription(user);
    }

    function test_createVrfSubscription_afterCancel_enablesPlay() public {
        GachaMachine owned = _machineWithOwnedSub();
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        prize.setApprovalForAll(address(owned), true);
        owned.donateNFT(address(prize), TOKEN_ID, 1, COMMON);
        vm.stopPrank();

        vm.prank(admin);
        owned.cancelVrfSubscription(admin);

        vm.prank(admin);
        owned.createVrfSubscription();
        (,, uint256 subId,,,) = owned.vrfConfig();
        assertGt(subId, 0);

        vm.startPrank(user);
        commonCap.setApprovalForAll(address(owned), true);
        uint256 requestId = owned.play(COMMON);
        vm.stopPrank();
        assertGt(requestId, 0);
    }

    function test_createVrfSubscription_revertsIfSubExists() public {
        vm.prank(admin);
        vm.expectRevert("Subscription exists");
        machine.createVrfSubscription();
    }

    function test_donate_revertsIfTransferDoesNotLand() public {
        NoopERC1155 noop = new NoopERC1155();
        vm.prank(admin);
        machine.approveNFT(COMMON, address(noop), true);
        vm.prank(user);
        vm.expectRevert("Transfer failed");
        machine.donateNFT(address(noop), 1, 1, COMMON);
    }

    function test_withdrawPrize_revertsWrongIdentity() public {
        vm.prank(admin);
        prize.mint(user, TOKEN_ID, 1);
        vm.startPrank(user);
        prize.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prize), TOKEN_ID, 1, COMMON);
        vm.stopPrank();

        vm.prank(admin);
        vm.expectRevert("Wrong prize");
        machine.withdrawPrize(COMMON, 0, address(prize), TOKEN_ID + 1, admin);
    }

    function test_approveNFT_freezesTokenStandard() public {
        assertEq(machine.tokenStandard(address(prize)), machine.TOKEN_ERC1155());
        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize), false);
        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize), true);
        assertEq(machine.tokenStandard(address(prize)), machine.TOKEN_ERC1155());
    }

    function _machineWithOwnedSub() internal returns (GachaMachine owned) {
        GachaMachine.VRFConfig memory cfg = MachineHarness.vrfConfig(address(vrf));
        cfg.subscriptionId = 0;
        vm.startPrank(owner);
        owned = new GachaMachine(cfg);
        owned.grantRole(owned.ADMIN_ROLE(), admin);
        commonCap.grantRole(commonCap.MINTER_ROLE(), address(owned));
        vm.stopPrank();

        vm.startPrank(admin);
        owned.registerRarity(address(commonCap), "Common", PRICE);
        owned.approveNFT(COMMON, address(prize), true);
        vm.stopPrank();
    }
}
