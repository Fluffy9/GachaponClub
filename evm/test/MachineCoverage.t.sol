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
    event NFTApproved(uint256 indexed rarityId, address tokenContract);
    event NFTDonated(
        uint256 indexed rarityId, address tokenContract, uint256 tokenId, uint256 amount, bool isERC721, address from
    );
    event PrizeRedeemed(
        uint256 indexed rarityId, address tokenContract, uint256 tokenId, uint256 amount, bool isERC721, address to
    );
    event TokensWithdrawn(address indexed token, uint256 amount, address to);
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
        emit NFTApproved(COMMON, address(prize1155));

        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize1155), true);

        (bool approved, uint256 rarityId) = machine.getApprovedNFT(address(prize1155));
        assertTrue(approved);
        assertEq(rarityId, COMMON);
        assertEq(machine.approvedNFTs(address(prize1155)), COMMON + 1);
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

    function test_approveNFT_revertsIfAlreadyApproved() public {
        _registerCommon();
        vm.startPrank(admin);
        machine.registerRarity(address(prize721), "Rare", 0.05 ether);
        machine.approveNFT(COMMON, address(prize1155), true);
        vm.expectRevert("NFT contract already approved for a rarity");
        machine.approveNFT(1, address(prize1155), true);
        vm.stopPrank();
    }

    function test_getApprovedNFT_unregisteredIsFalse() public view {
        (bool approved, uint256 rarityId) = machine.getApprovedNFT(address(prize1155));
        assertFalse(approved);
        assertEq(rarityId, 0);
    }

    function test_getTokenRarity_unregisteredIsFalse() public view {
        (bool registered, uint256 rarityId) = machine.getTokenRarity(address(capsule));
        assertFalse(registered);
        assertEq(rarityId, 0);
    }

    function test_unapprove_emitsRarityZero() public {
        _registerCommon();
        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize1155), true);

        vm.expectEmit(true, false, false, true);
        emit NFTApproved(0, address(prize1155));

        vm.prank(admin);
        machine.approveNFT(COMMON, address(prize1155), false);
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
        machine.donateNFT(address(prize1155), TOKEN_ID, 4);

        assertEq(machine.getPrizeCount(COMMON), 1);
        (uint256 id, uint256 amount) = machine.getPrizeInfo(COMMON, 0);
        assertEq(id, TOKEN_ID);
        assertEq(amount, 4);
        assertEq(prize1155.balanceOf(address(machine), TOKEN_ID), 4);
    }

    function test_donateNFT_revertsIfInsufficientBalance() public {
        _registerCommon();
        _approveAndMint1155(1);

        vm.prank(user);
        vm.expectRevert("ERC1155: insufficient balance for transfer");
        machine.donateNFT(address(prize1155), TOKEN_ID, 2);
    }

    function test_redeemPrize_isLIFO() public {
        _registerCommon();
        _approveAndMint1155(1);

        vm.prank(admin);
        prize1155.mint(user, TOKEN_ID + 1, 1);

        vm.startPrank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, 1);
        machine.donateNFT(address(prize1155), TOKEN_ID + 1, 1);
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
        machine.donateNFT(address(prize1155), TOKEN_ID, 1);

        vm.prank(admin);
        vm.expectRevert("ERC1155: transfer to the zero address");
        machine.redeemPrize(COMMON, address(0));
    }

    function testFuzz_donateERC1155_amount(uint96 amount) public {
        amount = uint96(bound(amount, 1, 10_000));
        _registerCommon();
        _approveAndMint1155(amount);

        vm.prank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, amount);

        assertEq(machine.getPrizeCount(COMMON), 1);
        (, uint256 stored) = machine.getPrizeInfo(COMMON, 0);
        assertEq(stored, amount);
        assertEq(prize1155.balanceOf(address(machine), TOKEN_ID), amount);
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

    function test_scheduleNFTWithdrawal_revertsIfInsufficient1155() public {
        _registerCommon();
        vm.prank(admin);
        vm.expectRevert("Insufficient NFT balance");
        machine.scheduleNFTWithdrawal(address(prize1155), TOKEN_ID, 1, user);
    }

    function test_scheduleNFTWithdrawal_revertsErc721AmountNotOne() public {
        _registerCommon();
        vm.prank(admin);
        prize721.mint(address(machine));

        vm.prank(admin);
        vm.expectRevert("ERC721 amount must be 1");
        machine.scheduleNFTWithdrawal(address(prize721), 0, 2, user);
    }

    function test_executeNFTWithdrawal_cannotRunTwice() public {
        _registerCommon();
        _approveAndMint1155(1);
        vm.prank(user);
        machine.donateNFT(address(prize1155), TOKEN_ID, 1);

        bytes32 withdrawalId =
            keccak256(abi.encodePacked(address(prize1155), TOKEN_ID, uint256(1), user, block.timestamp));

        vm.prank(admin);
        machine.scheduleNFTWithdrawal(address(prize1155), TOKEN_ID, 1, user);

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
        machine.donateNFT(address(prize1155), TOKEN_ID, 1);

        bytes32 withdrawalId =
            keccak256(abi.encodePacked(address(prize1155), TOKEN_ID, uint256(1), other, block.timestamp));

        vm.prank(admin);
        machine.scheduleNFTWithdrawal(address(prize1155), TOKEN_ID, 1, other);
        vm.warp(block.timestamp + 1 weeks);
        vm.prank(admin);
        machine.executeNFTWithdrawal(withdrawalId);

        assertEq(machine.getPrizeCount(COMMON), 0);
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

    function test_purchase_refundsExcess() public {
        _registerCommon();
        _grantMachineMinter();
        vm.deal(user, 1 ether);

        vm.prank(user);
        machine.purchase{value: 0.05 ether}(COMMON);

        assertEq(capsule.balanceOf(user, COMMON), 1);
        assertEq(address(machine).balance, 0.01 ether);
        assertEq(user.balance, 0.99 ether);
    }

    function test_purchase_revertsIfUnderpaid() public {
        _registerCommon();
        _grantMachineMinter();
        vm.deal(user, 1 ether);

        vm.prank(user);
        vm.expectRevert("Insufficient payment");
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

    function test_changeAdmin_emitsAndLeavesDefaultAdmin() public {
        vm.expectEmit(true, true, false, true);
        emit AdminChanged(admin, other);

        vm.prank(admin);
        machine.changeAdmin(other);

        assertTrue(machine.hasRole(machine.ADMIN_ROLE(), other));
        assertFalse(machine.hasRole(machine.ADMIN_ROLE(), admin));
        assertTrue(machine.hasRole(machine.DEFAULT_ADMIN_ROLE(), owner), "deployer must keep DEFAULT_ADMIN_ROLE");
    }

    function test_ownerCanRestoreAdminAfterChangeAdmin() public {
        vm.prank(admin);
        machine.changeAdmin(other);

        bytes32 adminRole = machine.ADMIN_ROLE();
        vm.prank(owner);
        machine.grantRole(adminRole, admin);
        assertTrue(machine.hasRole(adminRole, admin));
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
