// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/Machine.sol";
import "../src/Gacha.sol";
import "./MockPrizeNFT.sol";
import "./MockPrizeERC721.sol";
import "./mocks/TestHelpers.sol";
import "./mocks/VRFCoordinatorV2PlusMock.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000 ether);
    }
}

/**
 * @title GachaMachineCoverage
 * @notice Edge cases, events, and access control that the original Machine
 *         suite does not cover. Safe to run alongside Machine.t.sol.
 */
contract GachaMachineCoverage is Test {
    GachaMachine public machine;
    VRFCoordinatorV2PlusMock public vrf;
    GachaNFT public capsule;
    MockPrizeNFT public prize1155;
    MockPrizeERC721 public prize721;
    MockERC20 public token;

    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user = makeAddr("user");
    address public other = makeAddr("other");

    uint256 public constant COMMON = 0;
    uint256 public constant TOKEN_ID = 42;

    event RarityRegistered(uint256 indexed rarityId, address tokenContract, string name, uint256 price);
    event RarityPriceUpdated(uint256 indexed rarityId, uint256 price);
    event RarityEnabled(uint256 indexed rarityId, bool enabled);
    event NFTApproved(uint256 indexed rarityId, address tokenContract, bool approved);
    event NFTDonated(
        uint256 indexed rarityId, address tokenContract, uint256 tokenId, uint256 amount, bool isERC721, address from
    );
    event PrizeRedeemed(
        uint256 indexed rarityId, address tokenContract, uint256 tokenId, uint256 amount, bool isERC721, address to
    );
    event TokensWithdrawn(address indexed token, uint256 amount, address to);
    event AdminTransferStarted(address indexed from, address indexed to);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event CapsulePurchased(address indexed buyer, uint256 indexed rarityId, uint256 price, uint256 paid);

    function setUp() public {
        vm.startPrank(owner);
        vrf = new VRFCoordinatorV2PlusMock();
        machine = new GachaMachine(MachineHarness.vrfConfig(address(vrf)));
        capsule = new GachaNFT();
        prize1155 = new MockPrizeNFT();
        prize721 = new MockPrizeERC721();
        token = new MockERC20();

        machine.grantRole(machine.ADMIN_ROLE(), admin);
        capsule.grantRole(capsule.MINTER_ROLE(), address(machine));
        prize1155.grantRole(prize1155.MINTER_ROLE(), admin);
        prize721.grantRole(prize721.MINTER_ROLE(), admin);
        vm.stopPrank();
    }

    function _registerCommon() internal {
        vm.prank(admin);
        machine.registerRarity(address(capsule), "Common", 0.01 ether);
    }

    function _approveAndMint1155(uint256 amount) internal {
        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize1155), true);

        vm.prank(admin);
        prize1155.mint(user, TOKEN_ID, amount);

        vm.prank(user);
        prize1155.setApprovalForAll(address(machine), true);
    }

    // -------------------------------------------------------------------------
    // registerRarity
    // -------------------------------------------------------------------------

    function test_registerRarity_emitsAndStores() public {
        vm.expectEmit(true, false, false, true);
        emit RarityRegistered(0, address(capsule), "Common", 0.01 ether);

        vm.prank(admin);
        machine.registerRarity(address(capsule), "Common", 0.01 ether);

        GachaMachine.RarityInfo memory info = machine.getRarityInfo(0);
        assertEq(info.tokenContract, address(capsule));
        assertEq(info.name, "Common");
        assertEq(info.price, 0.01 ether);
        assertTrue(info.enabled);
        (bool registered, uint256 rarityId) = machine.getTokenRarity(address(capsule));
        assertTrue(registered);
        assertEq(rarityId, 0);
        assertEq(machine.getRarityCount(), 1);
    }

    function test_registerRarity_revertsZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert("Invalid token contract");
        machine.registerRarity(address(0), "Common", 0.01 ether);
    }

    function test_registerRarity_revertsEmptyName() public {
        vm.prank(admin);
        vm.expectRevert("Name cannot be empty");
        machine.registerRarity(address(capsule), "", 0.01 ether);
    }

    function test_registerRarity_revertsZeroPrice() public {
        vm.prank(admin);
        vm.expectRevert("Price must be greater than 0");
        machine.registerRarity(address(capsule), "Common", 0);
    }

    function test_setRarityPrice_emits() public {
        _registerCommon();

        vm.expectEmit(true, false, false, true);
        emit RarityPriceUpdated(COMMON, 0.02 ether);

        vm.prank(admin);
        machine.setRarityPrice(COMMON, 0.02 ether);
        assertEq(machine.getRarityInfo(COMMON).price, 0.02 ether);
    }

    function test_setRarityPrice_revertsZero() public {
        _registerCommon();
        vm.prank(admin);
        vm.expectRevert("Price must be greater than 0");
        machine.setRarityPrice(COMMON, 0);
    }

    function test_setRarityPrice_revertsInvalidId() public {
        vm.prank(admin);
        vm.expectRevert("Invalid rarity ID");
        machine.setRarityPrice(0, 1 ether);
    }

    function test_setRarityPrice_revertsForNonAdmin() public {
        _registerCommon();
        vm.prank(user);
        vm.expectRevert();
        machine.setRarityPrice(COMMON, 1 ether);
    }

    function test_setRarityEnabled_emits() public {
        _registerCommon();

        vm.expectEmit(true, false, false, true);
        emit RarityEnabled(COMMON, false);

        vm.prank(admin);
        machine.setRarityEnabled(COMMON, false);
        assertFalse(machine.getRarityInfo(COMMON).enabled);
    }

    function test_setRarityEnabled_revertsForNonAdmin() public {
        _registerCommon();
        vm.prank(user);
        vm.expectRevert();
        machine.setRarityEnabled(COMMON, false);
    }

    // -------------------------------------------------------------------------
    // approveNFT
    // -------------------------------------------------------------------------

    function test_approveNFT_emitsAndStoresPlusOne() public {
        _registerCommon();

        vm.expectEmit(true, false, false, true);
        emit NFTApproved(COMMON, address(prize1155), true);

        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize1155), true);

        assertTrue(machine.isApprovedForRarity(address(prize1155), COMMON));
        assertTrue(machine.approvedForRarity(address(prize1155), COMMON));
    }

    function test_approveNFT_revertsZeroAddress() public {
        _registerCommon();
        vm.prank(admin);
        vm.expectRevert("Invalid token contract");
        machine.approveNFT(COMMON, address(0), true);
    }

    function test_approveNFT_revertsNonNftContract() public {
        _registerCommon();
        DummyContract dummy = new DummyContract();

        vm.prank(admin);
        vm.expectRevert();
        machine.approveNFT(COMMON, address(dummy), true);
    }

    function test_approveNFT_sameCollectionOnTwoRarities() public {
        _registerCommon();
        vm.startPrank(admin);
        machine.registerRarity(address(prize721), "Rare", 0.05 ether);
        machine.approveNFT(COMMON, address(prize1155), true);
        machine.approveNFT(1, address(prize1155), true);
        vm.stopPrank();

        assertTrue(machine.isApprovedForRarity(address(prize1155), COMMON));
        assertTrue(machine.isApprovedForRarity(address(prize1155), 1));
    }

    function test_approveNFT_revertsIfAlreadyApprovedForSameRarity() public {
        _registerCommon();
        vm.startPrank(admin);
        machine.approveNFT(COMMON, address(prize1155), true);
        vm.expectRevert("Already approved for rarity");
        machine.approveNFT(COMMON, address(prize1155), true);
        vm.stopPrank();
    }

    function test_getApprovedNFT_unregisteredIsFalse() public view {
        assertFalse(machine.isApprovedForRarity(address(prize1155), COMMON));
    }

    function test_getTokenRarity_unregisteredIsFalse() public view {
        (bool registered, uint256 rarityId) = machine.getTokenRarity(address(capsule));
        assertFalse(registered);
        assertEq(rarityId, 0);
    }

    function test_unapprove_emitsFalse() public {
        _registerCommon();
        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize1155), true);

        vm.expectEmit(true, false, false, true);
        emit NFTApproved(COMMON, address(prize1155), false);

        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize1155), false);
        assertFalse(machine.isApprovedForRarity(address(prize1155), COMMON));
    }

    // -------------------------------------------------------------------------
    // donate / redeem
    // -------------------------------------------------------------------------

    function test_donateNFT_emitsAndRecordsPrize() public {
        _registerCommon();
        _approveAndMint1155(4);

        vm.expectEmit(true, false, false, true);
        emit NFTDonated(COMMON, address(prize1155), TOKEN_ID, 4, false, user);

        vm.prank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, 4, COMMON);

        assertEq(machine.getPrizeCount(COMMON), 1);
        GachaMachine.PrizeInfo memory prize = machine.getPrizeInfo(COMMON, 0);
        assertEq(prize.tokenId, TOKEN_ID);
        assertEq(prize.amount, 4);
        assertEq(prize.tokenContract, address(prize1155));
        assertFalse(prize.isERC721);
        assertEq(prize1155.balanceOf(address(machine), TOKEN_ID), 4);
        assertEq(capsule.balanceOf(user, COMMON), 1);
    }

    function test_donateNFT_revertsIfInsufficientBalance() public {
        _registerCommon();
        _approveAndMint1155(1);

        vm.prank(user);
        vm.expectRevert("ERC1155: insufficient balance for transfer");
        machine.donateNFT(address(prize1155), TOKEN_ID, 2, COMMON);
    }

    function test_redeemPrize_isLIFO() public {
        _registerCommon();
        _approveAndMint1155(1);

        vm.prank(admin);
        prize1155.mint(user, TOKEN_ID + 1, 1);

        vm.startPrank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, 1, COMMON);
        machine.donateNFT(address(prize1155), TOKEN_ID + 1, 1, COMMON);
        vm.stopPrank();

        vm.expectEmit(true, false, false, true);
        emit PrizeRedeemed(COMMON, address(prize1155), TOKEN_ID + 1, 1, false, other);

        vm.prank(admin);
        machine.redeemPrize(COMMON, other);

        assertEq(prize1155.balanceOf(other, TOKEN_ID + 1), 1);
        assertEq(prize1155.balanceOf(other, TOKEN_ID), 0);
        assertEq(machine.getPrizeCount(COMMON), 1);
    }

    function test_redeemPrize_toZeroAddressRevertsForERC1155() public {
        _registerCommon();
        _approveAndMint1155(1);

        vm.prank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, 1, COMMON);

        vm.prank(admin);
        vm.expectRevert("ERC1155: transfer to the zero address");
        machine.redeemPrize(COMMON, address(0));
    }

    function testFuzz_donateERC1155_amount(uint96 amount) public {
        amount = uint96(bound(amount, 1, 10_000));
        _registerCommon();
        _approveAndMint1155(amount);

        vm.prank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, amount, COMMON);

        assertEq(machine.getPrizeCount(COMMON), 1);
        assertEq(machine.getPrizeInfo(COMMON, 0).amount, amount);
        assertEq(prize1155.balanceOf(address(machine), TOKEN_ID), amount);
        assertEq(capsule.balanceOf(user, COMMON), 1);
    }

    function test_donateERC721_mintsSameTierCapsule() public {
        _registerCommon();
        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize721), true);
        vm.prank(admin);
        uint256 tokenId = prize721.mint(user);

        vm.startPrank(user);
        prize721.approve(address(machine), tokenId);
        machine.donateNFT(address(prize721), tokenId, 1, COMMON);
        vm.stopPrank();

        assertEq(prize721.ownerOf(tokenId), address(machine));
        assertEq(capsule.balanceOf(user, COMMON), 1);
    }

    // -------------------------------------------------------------------------
    // withdrawals
    // -------------------------------------------------------------------------

    function test_machine_rejectsPlainEthTransfer() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        (bool ok,) = address(machine).call{value: 1 ether}("");
        assertFalse(ok);
        assertEq(address(machine).balance, 0);
    }

    function test_withdraw_emitsForEth() public {
        vm.deal(address(machine), 2 ether);

        vm.expectEmit(true, false, false, true);
        emit TokensWithdrawn(address(0), 1 ether, admin);

        vm.prank(admin);
        machine.withdraw(address(0), 1 ether, admin);
        assertEq(admin.balance, 1 ether);
        assertEq(address(machine).balance, 1 ether);
    }

    function test_withdraw_revertsIfRecipientRejectsEth() public {
        RevertingReceiver sink = new RevertingReceiver();
        vm.deal(address(machine), 1 ether);

        vm.prank(admin);
        vm.expectRevert("ETH transfer failed");
        machine.withdraw(address(0), 1 ether, address(sink));
    }

    function test_withdraw_revertsIfInsufficientErc20() public {
        vm.prank(admin);
        vm.expectRevert("Insufficient token balance");
        machine.withdraw(address(token), 1, admin);
    }

    function test_withdraw_revertsIfErc20ReturnsFalse() public {
        FalseReturnERC20 bad = new FalseReturnERC20();
        bad.mint(address(machine), 1 ether);

        vm.prank(admin);
        vm.expectRevert("Token transfer failed");
        machine.withdraw(address(bad), 1 ether, admin);
    }

    function test_schedulePrizeWithdrawal_revertsEmptyBag() public {
        _registerCommon();
        vm.prank(admin);
        vm.expectRevert("Invalid prize index");
        machine.schedulePrizeWithdrawal(COMMON, 0, user);
    }

    function test_executeNFTWithdrawal_cannotRunTwice() public {
        _registerCommon();
        _approveAndMint1155(1);
        vm.prank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, 1, COMMON);

        vm.prank(admin);
        bytes32 withdrawalId = machine.schedulePrizeWithdrawal(COMMON, 0, user);

        vm.warp(block.timestamp + 1 weeks);

        vm.startPrank(admin);
        machine.executeNFTWithdrawal(withdrawalId);
        vm.expectRevert("Withdrawal not found");
        machine.executeNFTWithdrawal(withdrawalId);
        vm.stopPrank();
    }

    function test_redeemAfterAdminWithdrawal_clearsBag() public {
        _registerCommon();
        _approveAndMint1155(1);
        vm.prank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, 1, COMMON);

        vm.prank(admin);
        bytes32 withdrawalId = machine.schedulePrizeWithdrawal(COMMON, 0, other);
        assertEq(machine.getPrizeCount(COMMON), 0);

        vm.warp(block.timestamp + 1 weeks);
        vm.prank(admin);
        machine.executeNFTWithdrawal(withdrawalId);

        assertEq(prize1155.balanceOf(other, TOKEN_ID), 1);

        vm.prank(admin);
        vm.expectRevert("No prizes available");
        machine.redeemPrize(COMMON, user);
    }

    // -------------------------------------------------------------------------
    // purchase
    // -------------------------------------------------------------------------

    function _grantMachineMinter() internal {
        bytes32 minterRole = capsule.MINTER_ROLE();
        vm.prank(owner);
        capsule.grantRole(minterRole, address(machine));
    }

    function test_purchase_mintsCapsuleAndKeepsPayment() public {
        _registerCommon();
        _grantMachineMinter();
        vm.deal(user, 1 ether);

        vm.expectEmit(true, true, false, true);
        emit CapsulePurchased(user, COMMON, 0.01 ether, 0.01 ether);

        vm.prank(user);
        machine.purchase{value: 0.01 ether}(COMMON);

        assertEq(capsule.balanceOf(user, COMMON), 1);
        assertEq(address(machine).balance, 0.01 ether);
        assertEq(user.balance, 0.99 ether);
    }

    function test_purchase_revertsIfOverpaid() public {
        _registerCommon();
        _grantMachineMinter();
        vm.deal(user, 1 ether);

        vm.prank(user);
        vm.expectRevert("Incorrect payment");
        machine.purchase{value: 0.05 ether}(COMMON);
    }

    function test_purchase_revertsIfUnderpaid() public {
        _registerCommon();
        _grantMachineMinter();
        vm.deal(user, 1 ether);

        vm.prank(user);
        vm.expectRevert("Incorrect payment");
        machine.purchase{value: 0.001 ether}(COMMON);
    }

    function test_purchase_revertsIfRarityDisabled() public {
        _registerCommon();
        _grantMachineMinter();
        vm.prank(admin);
        machine.setRarityEnabled(COMMON, false);
        vm.deal(user, 1 ether);

        vm.prank(user);
        vm.expectRevert("Rarity not enabled");
        machine.purchase{value: 0.01 ether}(COMMON);
    }

    function test_purchase_revertsIfMachineIsNotMinter() public {
        _registerCommon();
        bytes32 minter = capsule.MINTER_ROLE();
        vm.prank(owner);
        capsule.revokeRole(minter, address(machine));
        vm.deal(user, 1 ether);

        vm.prank(user);
        vm.expectRevert();
        machine.purchase{value: 0.01 ether}(COMMON);
    }

    function test_purchase_revertsInvalidRarity() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        vm.expectRevert("Invalid rarity ID");
        machine.purchase{value: 0.01 ether}(0);
    }

    // -------------------------------------------------------------------------
    // admin transfer
    // -------------------------------------------------------------------------

    function test_transferAdmin_movesBothRoles() public {
        vm.expectEmit(true, true, false, true);
        emit AdminTransferStarted(owner, other);

        vm.prank(owner);
        machine.transferAdmin(other);

        vm.expectEmit(true, true, false, true);
        emit AdminChanged(owner, other);

        vm.prank(other);
        machine.acceptAdmin();

        assertTrue(machine.hasRole(machine.ADMIN_ROLE(), other));
        assertTrue(machine.hasRole(machine.DEFAULT_ADMIN_ROLE(), other));
        assertFalse(machine.hasRole(machine.ADMIN_ROLE(), owner));
        assertFalse(machine.hasRole(machine.DEFAULT_ADMIN_ROLE(), owner));
        // original ADMIN_ROLE holder is untouched
        assertTrue(machine.hasRole(machine.ADMIN_ROLE(), admin));
    }

    function test_cancelAdminTransfer() public {
        vm.prank(owner);
        machine.transferAdmin(other);

        vm.prank(owner);
        machine.cancelAdminTransfer();

        vm.prank(other);
        vm.expectRevert("Not pending admin");
        machine.acceptAdmin();
    }

    function test_supportsInterface_accessControlAndErc1155Receiver() public view {
        assertTrue(machine.supportsInterface(0x7965db0b)); // AccessControl
        assertTrue(machine.supportsInterface(0x4e2312e0)); // ERC1155Receiver
        assertTrue(machine.supportsInterface(0x01ffc9a7)); // ERC165
    }

    function test_getPrizeCount_revertsInvalidRarity() public {
        vm.expectRevert("Invalid rarity ID");
        machine.getPrizeCount(0);
    }
}
