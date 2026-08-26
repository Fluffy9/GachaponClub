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

/**
 * @title GachaMachineTest
 * @dev Test suite for the GachaMachine contract
 * Tests the registration and management of ERC1155 contracts as rarities
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000 ether);
    }
}

contract GachaMachineTest is Test {
    // Test contracts
    GachaMachine public machine;
    VRFCoordinatorV2PlusMock public vrf;
    GachaNFT public commonNFT;
    GachaNFT public rareNFT;
    GachaNFT public epicNFT;
    MockPrizeNFT public prizeNFT;
    MockPrizeERC721 public prizeERC721;
    MockERC20 public mockToken;

    // Test addresses
    address public owner = address(1);
    address public user = address(2);
    address public admin = address(3);

    uint256 public constant COMMON_RARITY = 0;
    uint256 public constant RARE_RARITY = 1;
    uint256 public constant EPIC_RARITY = 2;

    // Prize token IDs
    uint256 public constant COMMON_PRIZE_1 = 100;
    uint256 public constant COMMON_PRIZE_2 = 101;
    uint256 public constant RARE_PRIZE_1 = 200;
    uint256 public constant RARE_PRIZE_2 = 201;
    uint256 public constant EPIC_PRIZE_1 = 300;
    uint256 public constant EPIC_PRIZE_2 = 301;

    function setUp() public {
        vm.startPrank(owner);
        // Deploy contracts
        vrf = new VRFCoordinatorV2PlusMock();
        machine = new GachaMachine(MachineHarness.vrfConfig(address(vrf)));
        commonNFT = new GachaNFT();
        rareNFT = new GachaNFT();
        epicNFT = new GachaNFT();
        prizeNFT = new MockPrizeNFT();
        prizeERC721 = new MockPrizeERC721();
        mockToken = new MockERC20();
        vm.stopPrank();

        // Grant admin role to admin address
        vm.startPrank(owner);
        machine.grantRole(machine.ADMIN_ROLE(), admin);
        // Grant minter role to admin for all NFT contracts
        commonNFT.grantRole(commonNFT.MINTER_ROLE(), admin);
        rareNFT.grantRole(rareNFT.MINTER_ROLE(), admin);
        epicNFT.grantRole(epicNFT.MINTER_ROLE(), admin);
        commonNFT.grantRole(commonNFT.MINTER_ROLE(), address(machine));
        rareNFT.grantRole(rareNFT.MINTER_ROLE(), address(machine));
        epicNFT.grantRole(epicNFT.MINTER_ROLE(), address(machine));
        prizeNFT.grantRole(prizeNFT.MINTER_ROLE(), admin);
        prizeERC721.grantRole(prizeERC721.MINTER_ROLE(), admin);
        vm.stopPrank();
    }

    /**
     * @dev Test registering all three initial rarities
     * Verifies that each rarity is correctly registered with its name, price, and contract
     */
    function testRegisterInitialRarities() public {
        vm.startPrank(admin);
        // Register all three rarities with their respective prices
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.registerRarity(address(rareNFT), "Rare", 0.05 ether);
        machine.registerRarity(address(epicNFT), "Epic", 0.1 ether);
        vm.stopPrank();

        // Verify Common rarity registration
        GachaMachine.RarityInfo memory commonInfo = machine.getRarityInfo(
            COMMON_RARITY
        );
        assertEq(
            address(commonInfo.tokenContract),
            address(commonNFT),
            "Common NFT contract mismatch"
        );
        assertEq(commonInfo.name, "Common", "Common name mismatch");
        assertEq(commonInfo.price, 0.01 ether, "Common price mismatch");
        assertTrue(commonInfo.enabled, "Common should be enabled");
        (bool commonRegistered, uint256 commonId) = machine.getTokenRarity(
            address(commonNFT)
        );
        assertTrue(commonRegistered, "Common should be registered");
        assertEq(commonId, COMMON_RARITY, "Common rarity ID mismatch");

        // Verify Rare rarity registration
        GachaMachine.RarityInfo memory rareInfo = machine.getRarityInfo(
            RARE_RARITY
        );
        assertEq(
            address(rareInfo.tokenContract),
            address(rareNFT),
            "Rare NFT contract mismatch"
        );
        assertEq(rareInfo.name, "Rare", "Rare name mismatch");
        assertEq(rareInfo.price, 0.05 ether, "Rare price mismatch");
        assertTrue(rareInfo.enabled, "Rare should be enabled");
        (bool rareRegistered, uint256 rareId) = machine.getTokenRarity(
            address(rareNFT)
        );
        assertTrue(rareRegistered, "Rare should be registered");
        assertEq(rareId, RARE_RARITY, "Rare rarity ID mismatch");

        // Verify Epic rarity registration
        GachaMachine.RarityInfo memory epicInfo = machine.getRarityInfo(
            EPIC_RARITY
        );
        assertEq(
            address(epicInfo.tokenContract),
            address(epicNFT),
            "Epic NFT contract mismatch"
        );
        assertEq(epicInfo.name, "Epic", "Epic name mismatch");
        assertEq(epicInfo.price, 0.1 ether, "Epic price mismatch");
        assertTrue(epicInfo.enabled, "Epic should be enabled");
        (bool epicRegistered, uint256 epicId) = machine.getTokenRarity(
            address(epicNFT)
        );
        assertTrue(epicRegistered, "Epic should be registered");
        assertEq(epicId, EPIC_RARITY, "Epic rarity ID mismatch");

        // Verify total number of rarities
        assertEq(machine.getRarityCount(), 3, "Incorrect number of rarities");
    }

    /**
     * @dev Test that non-admin users cannot register rarities
     */
    function testNonAdminCannotRegisterRarity() public {
        vm.startPrank(user);
        vm.expectRevert();
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.stopPrank();
    }

    /**
     * @dev Test that the same ERC1155 contract cannot be registered twice
     */
    function testCannotRegisterSameRarityTwice() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.expectRevert("Rarity already registered");
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.stopPrank();
    }

    /**
     * @dev Test updating prices for all rarities
     * Verifies that prices can be updated and are correctly stored
     */
    function testSetRarityPrices() public {
        vm.startPrank(admin);
        // Register all rarities
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.registerRarity(address(rareNFT), "Rare", 0.05 ether);
        machine.registerRarity(address(epicNFT), "Epic", 0.1 ether);

        // Update prices for all rarities
        machine.setRarityPrice(COMMON_RARITY, 0.02 ether);
        machine.setRarityPrice(RARE_RARITY, 0.06 ether);
        machine.setRarityPrice(EPIC_RARITY, 0.12 ether);
        vm.stopPrank();

        // Verify price updates
        assertEq(
            machine.getRarityInfo(COMMON_RARITY).price,
            0.02 ether,
            "Common price update failed"
        );
        assertEq(
            machine.getRarityInfo(RARE_RARITY).price,
            0.06 ether,
            "Rare price update failed"
        );
        assertEq(
            machine.getRarityInfo(EPIC_RARITY).price,
            0.12 ether,
            "Epic price update failed"
        );
    }

    /**
     * @dev Test enabling and disabling rarities
     * Verifies that rarities can be enabled/disabled and the state is correctly stored
     */
    function testSetRarityEnabled() public {
        vm.startPrank(admin);
        // Register all rarities
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.registerRarity(address(rareNFT), "Rare", 0.05 ether);
        machine.registerRarity(address(epicNFT), "Epic", 0.1 ether);

        // Disable Common and Epic rarities
        machine.setRarityEnabled(COMMON_RARITY, false);
        machine.setRarityEnabled(EPIC_RARITY, false);
        vm.stopPrank();

        // Verify enabled states
        assertFalse(
            machine.getRarityInfo(COMMON_RARITY).enabled,
            "Common should be disabled"
        );
        assertTrue(
            machine.getRarityInfo(RARE_RARITY).enabled,
            "Rare should be enabled"
        );
        assertFalse(
            machine.getRarityInfo(EPIC_RARITY).enabled,
            "Epic should be disabled"
        );
    }

    /**
     * @dev Test that invalid rarity IDs cannot be accessed
     */
    function testCannotGetInvalidRarityInfo() public {
        vm.startPrank(admin);
        vm.expectRevert("Invalid rarity ID");
        machine.getRarityInfo(COMMON_RARITY);
        vm.stopPrank();
    }

    function testNonAdminCannotAddPrize() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert();
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();
    }

    function testCannotAddPrizeToInvalidRarity() public {
        vm.startPrank(admin);
        vm.expectRevert("Invalid rarity ID");
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();
    }

    function testCannotAddZeroAmountPrize() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        vm.expectRevert("Amount must be greater than 0");
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 0, COMMON_RARITY);
        vm.stopPrank();
    }

    function testRedeemPrize() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        // Mint and donate the prize
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();

        // Now redeem the prize
        vm.startPrank(admin);
        machine.redeemPrize(COMMON_RARITY, user);
        vm.stopPrank();

        assertEq(prizeNFT.balanceOf(user, COMMON_PRIZE_1), 1);
        assertEq(prizeNFT.balanceOf(address(machine), COMMON_PRIZE_1), 0);
    }

    function testNonAdminCannotRedeemPrize() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert();
        machine.redeemPrize(COMMON_RARITY, user);
        vm.stopPrank();
    }

    function testCannotRedeemFromInvalidRarity() public {
        vm.startPrank(admin);
        vm.expectRevert("Invalid rarity ID");
        machine.redeemPrize(COMMON_RARITY, user);
        vm.stopPrank();
    }

    function testCannotRedeemFromDisabledRarity() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.setRarityEnabled(COMMON_RARITY, false);
        vm.expectRevert("Rarity not enabled");
        machine.redeemPrize(COMMON_RARITY, user);
        vm.stopPrank();
    }

    function testCannotRedeemFromEmptyPool() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.expectRevert("No prizes available");
        machine.redeemPrize(COMMON_RARITY, user);
        vm.stopPrank();
    }

    function testGetPrizeCount() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        // Mint and donate prizes
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        prizeNFT.mint(user, COMMON_PRIZE_2, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_2, 1, COMMON_RARITY);
        vm.stopPrank();

        assertEq(machine.getPrizeCount(COMMON_RARITY), 2);
    }

    function testGetPrizeInfo() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        // Mint and donate prizes
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        prizeNFT.mint(user, COMMON_PRIZE_2, 2);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_2, 2, COMMON_RARITY);
        vm.stopPrank();

        GachaMachine.PrizeInfo memory prizeA = machine.getPrizeInfo(
            COMMON_RARITY, 0
        );
        uint256 prizeId1 = prizeA.tokenId;
        uint256 amount1 = prizeA.amount;
        GachaMachine.PrizeInfo memory prizeB = machine.getPrizeInfo(
            COMMON_RARITY, 1
        );
        uint256 prizeId2 = prizeB.tokenId;
        uint256 amount2 = prizeB.amount;

        assertEq(prizeId1, COMMON_PRIZE_1);
        assertEq(amount1, 1);
        assertEq(prizeId2, COMMON_PRIZE_2);
        assertEq(amount2, 2);
    }

    function testCannotGetPrizeInfoFromInvalidRarity() public {
        vm.startPrank(admin);
        vm.expectRevert("Invalid rarity ID");
        machine.getPrizeInfo(COMMON_RARITY, 0);
        vm.stopPrank();
    }

    function testCannotGetPrizeInfoFromInvalidIndex() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        // Mint and donate prize
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();

        vm.startPrank(admin);
        vm.expectRevert("Invalid prize index");
        machine.getPrizeInfo(COMMON_RARITY, 1);
        vm.stopPrank();
    }

    /**
     * @dev Test approving and unapproving an NFT contract for donation
     */
    function testApproveNFT() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        assertTrue(machine.isApprovedForRarity(address(prizeNFT), COMMON_RARITY));

        // Test unapproving the NFT
        vm.startPrank(admin);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), false);
        vm.stopPrank();

        assertFalse(machine.isApprovedForRarity(address(prizeNFT), COMMON_RARITY));
    }

    /**
     * @dev Test that non-admin cannot approve or unapprove NFTs
     */
    function testNonAdminCannotApproveNFT() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert();
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();
    }

    /**
     * @dev Test that NFT cannot be approved for invalid rarity
     */
    function testCannotApproveNFTForInvalidRarity() public {
        vm.startPrank(admin);
        vm.expectRevert("Invalid rarity ID");
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();
    }

    /**
     * @dev Test that cannot unapprove non-approved NFT
     */
    function testCannotUnapproveNonApprovedNFT() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.expectRevert("NFT contract not approved");
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), false);
        vm.stopPrank();
    }

    /**
     * @dev Test that cannot donate unapproved NFT after unapproval
     */
    function testCannotDonateAfterUnapproval() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), false);
        vm.stopPrank();

        // Mint the prize NFT to the user
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        vm.expectRevert("NFT not approved for rarity");
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();
    }

    /**
     * @dev Test donating an approved NFT
     */
    function testDonateNFT() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        // Mint the prize NFT to the user
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();

        // Verify the prize NFT was transferred to the machine
        assertEq(prizeNFT.balanceOf(address(machine), COMMON_PRIZE_1), 1);
        assertEq(prizeNFT.balanceOf(user, COMMON_PRIZE_1), 0);
        assertEq(commonNFT.balanceOf(user, 0), 1);
    }

    /**
     * @dev Test that unapproved NFT cannot be donated
     */
    function testCannotDonateUnapprovedNFT() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.stopPrank();

        // Mint the prize NFT to the user
        vm.startPrank(admin);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        vm.expectRevert("NFT not approved for rarity");
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();
    }

    /**
     * @dev Test that NFT cannot be donated to disabled rarity
     */
    function testCannotDonateToDisabledRarity() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        machine.setRarityEnabled(COMMON_RARITY, false);
        vm.stopPrank();

        // Mint the prize NFT to the user
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        vm.expectRevert("Rarity not enabled");
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();
    }

    /**
     * @dev Test that zero amount NFT cannot be donated
     */
    function testCannotDonateZeroAmountNFT() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        // Mint the prize NFT to the user
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        vm.expectRevert("Amount must be greater than 0");
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 0, COMMON_RARITY);
        vm.stopPrank();
    }

    /**
     * @dev Test that NFT cannot be donated without approval
     */
    function testCannotDonateWithoutApproval() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        // Mint the prize NFT to the user
        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert("ERC1155: caller is not token owner or approved");
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();
    }

    /**
     * @dev Test adding multiple prizes to different rarities
     */
    function testAddMultiplePrizes() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.registerRarity(address(rareNFT), "Rare", 0.05 ether);
        machine.registerRarity(address(epicNFT), "Epic", 0.1 ether);

        // Create separate prize NFTs for each rarity
        MockPrizeNFT commonPrizeNFT = new MockPrizeNFT();
        MockPrizeNFT rarePrizeNFT = new MockPrizeNFT();
        MockPrizeNFT epicPrizeNFT = new MockPrizeNFT();

        // Grant minter role to admin for new prize NFTs
        commonPrizeNFT.grantRole(commonPrizeNFT.MINTER_ROLE(), admin);
        rarePrizeNFT.grantRole(rarePrizeNFT.MINTER_ROLE(), admin);
        epicPrizeNFT.grantRole(epicPrizeNFT.MINTER_ROLE(), admin);

        // Approve prizes for each rarity
        machine.approveNFT(COMMON_RARITY, address(commonPrizeNFT), true);
        machine.approveNFT(RARE_RARITY, address(rarePrizeNFT), true);
        machine.approveNFT(EPIC_RARITY, address(epicPrizeNFT), true);
        vm.stopPrank();

        // Mint prizes to the user
        vm.startPrank(admin);
        commonPrizeNFT.mint(user, COMMON_PRIZE_1, 1);
        commonPrizeNFT.mint(user, COMMON_PRIZE_2, 2);
        rarePrizeNFT.mint(user, RARE_PRIZE_1, 1);
        rarePrizeNFT.mint(user, RARE_PRIZE_2, 2);
        epicPrizeNFT.mint(user, EPIC_PRIZE_1, 1);
        epicPrizeNFT.mint(user, EPIC_PRIZE_2, 2);
        vm.stopPrank();

        vm.startPrank(user);
        commonPrizeNFT.setApprovalForAll(address(machine), true);
        rarePrizeNFT.setApprovalForAll(address(machine), true);
        epicPrizeNFT.setApprovalForAll(address(machine), true);

        // Donate prizes for each rarity
        machine.donateNFT(address(commonPrizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        machine.donateNFT(address(commonPrizeNFT), COMMON_PRIZE_2, 2, COMMON_RARITY);
        machine.donateNFT(address(rarePrizeNFT), RARE_PRIZE_1, 1, RARE_RARITY);
        machine.donateNFT(address(rarePrizeNFT), RARE_PRIZE_2, 2, RARE_RARITY);
        machine.donateNFT(address(epicPrizeNFT), EPIC_PRIZE_1, 1, EPIC_RARITY);
        machine.donateNFT(address(epicPrizeNFT), EPIC_PRIZE_2, 2, EPIC_RARITY);
        vm.stopPrank();

        // One capsule per donate call, matching the donated bag
        assertEq(commonNFT.balanceOf(user, 0), 2);
        assertEq(rareNFT.balanceOf(user, 0), 2);
        assertEq(epicNFT.balanceOf(user, 0), 2);

        // Verify prize counts
        assertEq(
            machine.getPrizeCount(COMMON_RARITY),
            2,
            "Common rarity should have 2 prizes"
        );
        assertEq(
            machine.getPrizeCount(RARE_RARITY),
            2,
            "Rare rarity should have 2 prizes"
        );
        assertEq(
            machine.getPrizeCount(EPIC_RARITY),
            2,
            "Epic rarity should have 2 prizes"
        );

        // Verify prize details for Common rarity
        GachaMachine.PrizeInfo memory prizeA = machine.getPrizeInfo(
            COMMON_RARITY, 0
        );
        uint256 prizeId1 = prizeA.tokenId;
        uint256 amount1 = prizeA.amount;
        GachaMachine.PrizeInfo memory prizeB = machine.getPrizeInfo(
            COMMON_RARITY, 1
        );
        uint256 prizeId2 = prizeB.tokenId;
        uint256 amount2 = prizeB.amount;
        assertEq(prizeId1, COMMON_PRIZE_1, "First common prize ID mismatch");
        assertEq(amount1, 1, "First common prize amount mismatch");
        assertEq(prizeId2, COMMON_PRIZE_2, "Second common prize ID mismatch");
        assertEq(amount2, 2, "Second common prize amount mismatch");

        // Verify prize details for Rare rarity
        prizeA = machine.getPrizeInfo(RARE_RARITY, 0);
        prizeId1 = prizeA.tokenId;
        amount1 = prizeA.amount;
        prizeB = machine.getPrizeInfo(RARE_RARITY, 1);
        prizeId2 = prizeB.tokenId;
        amount2 = prizeB.amount;
        assertEq(prizeId1, RARE_PRIZE_1, "First rare prize ID mismatch");
        assertEq(amount1, 1, "First rare prize amount mismatch");
        assertEq(prizeId2, RARE_PRIZE_2, "Second rare prize ID mismatch");
        assertEq(amount2, 2, "Second rare prize amount mismatch");

        // Verify prize details for Epic rarity
        prizeA = machine.getPrizeInfo(EPIC_RARITY, 0);
        prizeId1 = prizeA.tokenId;
        amount1 = prizeA.amount;
        prizeB = machine.getPrizeInfo(EPIC_RARITY, 1);
        prizeId2 = prizeB.tokenId;
        amount2 = prizeB.amount;
        assertEq(prizeId1, EPIC_PRIZE_1, "First epic prize ID mismatch");
        assertEq(amount1, 1, "First epic prize amount mismatch");
        assertEq(prizeId2, EPIC_PRIZE_2, "Second epic prize ID mismatch");
        assertEq(amount2, 2, "Second epic prize amount mismatch");
    }

    /**
     * @dev Test donating an ERC721 NFT
     */
    function testDonateERC721() public {
        // First, make sure admin has the proper roles
        vm.startPrank(owner);
        machine.grantRole(machine.ADMIN_ROLE(), admin);
        prizeERC721.grantRole(prizeERC721.MINTER_ROLE(), admin);
        vm.stopPrank();

        // Now proceed with the test
        vm.startPrank(admin);
        // Register rarity and mint token
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeERC721), true);
        uint256 tokenId = prizeERC721.mint(user);
        vm.stopPrank();

        // User approves transfer and donates
        vm.startPrank(user);
        prizeERC721.approve(address(machine), tokenId);
        machine.donateNFT(address(prizeERC721), tokenId, 1, COMMON_RARITY);
        vm.stopPrank();

        // Verify the NFT was transferred and the donor got a common capsule
        assertEq(prizeERC721.ownerOf(tokenId), address(machine));
        assertEq(commonNFT.balanceOf(user, 0), 1);
    }

    /**
     * @dev Test that ERC721 NFT cannot be donated without approval
     */
    function testCannotDonateERC721WithoutApproval() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        uint256 tokenId = prizeERC721.mint(user);
        machine.approveNFT(COMMON_RARITY, address(prizeERC721), true);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert("ERC721: caller is not token owner or approved");
        machine.donateNFT(address(prizeERC721), tokenId, 1, COMMON_RARITY);
        vm.stopPrank();
    }

    /**
     * @dev Test that ERC721 NFT cannot be donated with amount > 1
     */
    function testCannotDonateERC721WithAmountGreaterThanOne() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        uint256 tokenId = prizeERC721.mint(user);
        machine.approveNFT(COMMON_RARITY, address(prizeERC721), true);
        vm.stopPrank();

        vm.startPrank(user);
        prizeERC721.approve(address(machine), tokenId);
        vm.expectRevert("ERC721 amount must be 1");
        machine.donateNFT(address(prizeERC721), tokenId, 2, COMMON_RARITY);
        vm.stopPrank();
    }

    /**
     * @dev Test redeeming an ERC721 prize
     */
    function testRedeemERC721Prize() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeERC721), true);
        uint256 tokenId = prizeERC721.mint(user);
        vm.stopPrank();

        // Donate the ERC721
        vm.startPrank(user);
        prizeERC721.approve(address(machine), tokenId);
        machine.donateNFT(address(prizeERC721), tokenId, 1, COMMON_RARITY);
        vm.stopPrank();

        // Redeem the prize
        vm.startPrank(admin);
        machine.redeemPrize(COMMON_RARITY, user);
        vm.stopPrank();

        assertEq(prizeERC721.ownerOf(tokenId), user);
    }

    /**
     * @dev Test mixing ERC721 and ERC1155 prizes in the same rarity
     */
    function testMixedPrizeTypes() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        machine.approveNFT(COMMON_RARITY, address(prizeERC721), true);
        uint256 erc721TokenId = prizeERC721.mint(user);
        vm.stopPrank();

        // Mint and donate ERC1155
        vm.startPrank(admin);
        prizeNFT.mint(user, COMMON_PRIZE_1, 2);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        prizeERC721.approve(address(machine), erc721TokenId);

        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 2, COMMON_RARITY);
        machine.donateNFT(address(prizeERC721), erc721TokenId, 1, COMMON_RARITY);
        vm.stopPrank();

        // Verify prize counts and details
        assertEq(machine.getPrizeCount(COMMON_RARITY), 2);

        // First prize should be ERC1155
        GachaMachine.PrizeInfo memory prizeA = machine.getPrizeInfo(
            COMMON_RARITY, 0
        );
        uint256 prizeId1 = prizeA.tokenId;
        uint256 amount1 = prizeA.amount;
        assertEq(prizeId1, COMMON_PRIZE_1);
        assertEq(amount1, 2);

        // Second prize should be ERC721
        GachaMachine.PrizeInfo memory prizeB = machine.getPrizeInfo(
            COMMON_RARITY, 1
        );
        uint256 prizeId2 = prizeB.tokenId;
        uint256 amount2 = prizeB.amount;
        assertEq(prizeId2, erc721TokenId);
        assertEq(amount2, 1);
    }

    function testAdminCanWithdrawETH() public {
        // Send some ETH to the contract
        vm.deal(address(machine), 1 ether);

        vm.startPrank(admin);
        machine.withdraw(address(0), 1 ether, admin);
        vm.stopPrank();

        assertEq(admin.balance, 1 ether);
    }

    function testAdminCanWithdrawERC20() public {
        // Mint tokens to admin first
        vm.startPrank(owner);
        mockToken.transfer(admin, 1000 ether);
        vm.stopPrank();

        // Send some tokens to the contract
        vm.startPrank(admin);
        mockToken.transfer(address(machine), 1 ether);
        machine.withdraw(address(mockToken), 1 ether, admin);
        vm.stopPrank();

        assertEq(mockToken.balanceOf(admin), 1000 ether);
    }

    function testNonAdminCannotWithdraw() public {
        vm.deal(address(machine), 1 ether);
        vm.startPrank(user);
        vm.expectRevert();
        machine.withdraw(address(0), 1 ether, user);
        vm.stopPrank();
    }

    function testCannotWithdrawToZeroAddress() public {
        vm.deal(address(machine), 1 ether);
        vm.startPrank(admin);
        vm.expectRevert("Invalid recipient");
        machine.withdraw(address(0), 1 ether, address(0));
        vm.stopPrank();
    }

    function testCannotWithdrawZeroAmount() public {
        vm.deal(address(machine), 1 ether);
        vm.startPrank(admin);
        vm.expectRevert("Amount must be greater than 0");
        machine.withdraw(address(0), 0, admin);
        vm.stopPrank();
    }

    function testCannotWithdrawMoreThanBalance() public {
        vm.deal(address(machine), 1 ether);
        vm.startPrank(admin);
        vm.expectRevert("Insufficient ETH balance");
        machine.withdraw(address(0), 2 ether, admin);
        vm.stopPrank();
    }

    function testWithdrawPrize_sendsImmediately() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();

        vm.prank(admin);
        machine.withdrawPrize(COMMON_RARITY, 0, address(prizeNFT), COMMON_PRIZE_1, user);

        assertEq(machine.getPrizeCount(COMMON_RARITY), 0);
        assertEq(prizeNFT.balanceOf(user, COMMON_PRIZE_1), 1);
        assertEq(prizeNFT.balanceOf(address(machine), COMMON_PRIZE_1), 0);
    }

    function testWithdrawPrize_erc721() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeERC721), true);
        uint256 tokenId = prizeERC721.mint(user);
        vm.stopPrank();

        vm.startPrank(user);
        prizeERC721.approve(address(machine), tokenId);
        machine.donateNFT(address(prizeERC721), tokenId, 1, COMMON_RARITY);
        vm.stopPrank();

        vm.prank(admin);
        machine.withdrawPrize(COMMON_RARITY, 0, address(prizeERC721), tokenId, user);

        assertEq(prizeERC721.ownerOf(tokenId), user);
    }

    function testNonAdminCannotWithdrawPrize() public {
        vm.startPrank(user);
        vm.expectRevert();
        machine.withdrawPrize(COMMON_RARITY, 0, address(prizeNFT), 0, user);
        vm.stopPrank();
    }

    function testCannotWithdrawPrizeToZeroAddress() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        machine.approveNFT(COMMON_RARITY, address(prizeNFT), true);
        vm.stopPrank();

        vm.startPrank(owner);
        prizeNFT.mint(user, COMMON_PRIZE_1, 1);
        vm.stopPrank();

        vm.startPrank(user);
        prizeNFT.setApprovalForAll(address(machine), true);
        machine.donateNFT(address(prizeNFT), COMMON_PRIZE_1, 1, COMMON_RARITY);
        vm.stopPrank();

        vm.prank(admin);
        vm.expectRevert("Invalid recipient");
        machine.withdrawPrize(COMMON_RARITY, 0, address(prizeNFT), COMMON_PRIZE_1, address(0));
    }

    function testCannotWithdrawPrizeForEmptyBag() public {
        vm.startPrank(admin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
        vm.expectRevert("Invalid prize index");
        machine.withdrawPrize(COMMON_RARITY, 0, address(prizeNFT), 0, user);
        vm.stopPrank();
    }

    function testTransferAdmin() public {
        address newAdmin = address(4);

        vm.prank(owner);
        machine.transferAdmin(newAdmin);

        vm.prank(newAdmin);
        machine.acceptAdmin();

        assertTrue(machine.hasRole(machine.ADMIN_ROLE(), newAdmin));
        assertTrue(machine.hasRole(machine.DEFAULT_ADMIN_ROLE(), newAdmin));
        assertFalse(machine.hasRole(machine.ADMIN_ROLE(), owner));
        assertFalse(machine.hasRole(machine.DEFAULT_ADMIN_ROLE(), owner));

        vm.prank(newAdmin);
        machine.registerRarity(address(commonNFT), "Common", 0.01 ether);
    }

    function testNonOwnerCannotTransferAdmin() public {
        vm.prank(admin);
        vm.expectRevert();
        machine.transferAdmin(user);
    }

    function testCannotTransferAdminToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid admin address");
        machine.transferAdmin(address(0));
    }

    function testCannotTransferAdminToSelf() public {
        vm.prank(owner);
        vm.expectRevert("Cannot transfer to self");
        machine.transferAdmin(owner);
    }

    function testStrangerCannotAcceptAdmin() public {
        vm.prank(owner);
        machine.transferAdmin(user);

        vm.prank(admin);
        vm.expectRevert("Not pending admin");
        machine.acceptAdmin();
    }
}
