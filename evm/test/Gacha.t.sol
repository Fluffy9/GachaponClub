// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/Gacha.sol";

/**
 * @title GachaNFTTest
 * @notice Production coverage for the ERC1155 capsule contract: roles, rarity
 *         lifecycle, minting, and interface support.
 */
contract GachaNFTTest is Test {
    GachaNFT public gacha;

    address public owner = makeAddr("owner");
    address public minter = makeAddr("minter");
    address public user = makeAddr("user");
    address public stranger = makeAddr("stranger");

    uint256 public constant COMMON = 0;
    uint256 public constant RARE = 1;
    uint256 public constant EPIC = 2;

    bytes32 public minterRole;
    bytes32 public adminRole;

    event CapsuleMinted(address indexed to, uint256 rarityId, uint256 amount);
    event RarityAdded(uint256 indexed rarityId);

    function setUp() public {
        vm.prank(owner);
        gacha = new GachaNFT();

        minterRole = gacha.MINTER_ROLE();
        adminRole = gacha.DEFAULT_ADMIN_ROLE();

        vm.prank(owner);
        gacha.grantRole(minterRole, minter);
    }

    // -------------------------------------------------------------------------
    // Construction
    // -------------------------------------------------------------------------

    function test_constructor_grantsRolesToDeployer() public view {
        assertTrue(gacha.hasRole(adminRole, owner));
        assertTrue(gacha.hasRole(minterRole, owner));
    }

    function test_constructor_enablesDefaultRarities() public view {
        assertTrue(gacha.rarityExists(COMMON));
        assertTrue(gacha.rarityExists(RARE));
        assertTrue(gacha.rarityExists(EPIC));
        assertTrue(gacha.enabledRarities(COMMON));
        assertTrue(gacha.enabledRarities(RARE));
        assertTrue(gacha.enabledRarities(EPIC));
        assertFalse(gacha.rarityExists(3));
        assertFalse(gacha.enabledRarities(3));
    }

    function test_uri_usesConfiguredBase() public view {
        assertEq(gacha.uri(COMMON), "https://gachapon.club/api/rarity/{id}.json");
    }

    function test_supportsInterface_erc1155AndAccessControl() public view {
        assertTrue(gacha.supportsInterface(0xd9b67a26)); // ERC1155
        assertTrue(gacha.supportsInterface(0x0e89341c)); // ERC1155MetadataURI
        assertTrue(gacha.supportsInterface(0x7965db0b)); // AccessControl
        assertTrue(gacha.supportsInterface(0x01ffc9a7)); // ERC165
        assertFalse(gacha.supportsInterface(0xffffffff));
    }

    // -------------------------------------------------------------------------
    // Rarity admin
    // -------------------------------------------------------------------------

    function test_addRarity_asAdmin() public {
        vm.expectEmit(true, false, false, true);
        emit RarityAdded(3);

        vm.prank(owner);
        gacha.addRarity(3);

        assertTrue(gacha.rarityExists(3));
        assertTrue(gacha.enabledRarities(3));
    }

    function test_addRarity_revertsIfAlreadyExists() public {
        vm.prank(owner);
        vm.expectRevert("Rarity already exists");
        gacha.addRarity(COMMON);
    }

    function test_addRarity_revertsForNonAdmin() public {
        vm.prank(stranger);
        vm.expectRevert();
        gacha.addRarity(3);
    }

    function test_addRarity_minterCannotAdd() public {
        vm.prank(minter);
        vm.expectRevert();
        gacha.addRarity(3);
    }

    function test_setRarityEnabled_disablesAndBlocksMint() public {
        vm.prank(owner);
        gacha.setRarityEnabled(COMMON, false);

        assertFalse(gacha.enabledRarities(COMMON));

        vm.prank(minter);
        vm.expectRevert("Rarity not enabled");
        gacha.mint(user, COMMON, 1);
    }

    function test_setRarityEnabled_canReenable() public {
        vm.startPrank(owner);
        gacha.setRarityEnabled(COMMON, false);
        gacha.setRarityEnabled(COMMON, true);
        vm.stopPrank();

        vm.prank(minter);
        gacha.mint(user, COMMON, 1);
        assertEq(gacha.balanceOf(user, COMMON), 1);
    }

    function test_setRarityEnabled_cannotDisableUnknownRarity() public {
        vm.prank(owner);
        vm.expectRevert("Rarity does not exist");
        gacha.setRarityEnabled(99, false);
    }

    function test_setRarityEnabled_cannotEnableUnknownRarity() public {
        vm.prank(owner);
        vm.expectRevert("Rarity does not exist");
        gacha.setRarityEnabled(99, true);
    }

    function test_setRarityEnabled_revertsForNonAdmin() public {
        vm.prank(stranger);
        vm.expectRevert();
        gacha.setRarityEnabled(COMMON, false);
    }

    function test_disabledRarity_stillExists() public {
        vm.prank(owner);
        gacha.setRarityEnabled(COMMON, false);
        assertTrue(gacha.rarityExists(COMMON));
        assertFalse(gacha.enabledRarities(COMMON));
    }

    // -------------------------------------------------------------------------
    // Mint
    // -------------------------------------------------------------------------

    function test_mint_asMinter() public {
        vm.expectEmit(true, false, false, true);
        emit CapsuleMinted(user, COMMON, 3);

        vm.prank(minter);
        gacha.mint(user, COMMON, 3);

        assertEq(gacha.balanceOf(user, COMMON), 3);
    }

    function test_mint_asOriginalOwner() public {
        vm.prank(owner);
        gacha.mint(user, EPIC, 1);
        assertEq(gacha.balanceOf(user, EPIC), 1);
    }

    function test_mint_allDefaultRarities() public {
        vm.startPrank(minter);
        gacha.mint(user, COMMON, 1);
        gacha.mint(user, RARE, 2);
        gacha.mint(user, EPIC, 3);
        vm.stopPrank();

        assertEq(gacha.balanceOf(user, COMMON), 1);
        assertEq(gacha.balanceOf(user, RARE), 2);
        assertEq(gacha.balanceOf(user, EPIC), 3);
    }

    function test_mint_revertsForStranger() public {
        vm.prank(stranger);
        vm.expectRevert();
        gacha.mint(user, COMMON, 1);
    }

    function test_mint_revertsForUnknownRarity() public {
        vm.prank(minter);
        vm.expectRevert("Rarity not enabled");
        gacha.mint(user, 99, 1);
    }

    function test_mint_revertsToZeroAddress() public {
        vm.prank(minter);
        vm.expectRevert("ERC1155: mint to the zero address");
        gacha.mint(address(0), COMMON, 1);
    }

    function test_mint_zeroAmountIsNoOp() public {
        vm.prank(minter);
        gacha.mint(user, COMMON, 0);
        assertEq(gacha.balanceOf(user, COMMON), 0);
    }

    function testFuzz_mint_amount(uint96 amount) public {
        amount = uint96(bound(amount, 1, 1_000_000));
        vm.prank(minter);
        gacha.mint(user, RARE, amount);
        assertEq(gacha.balanceOf(user, RARE), amount);
    }

    function test_revokeMinter_blocksMint() public {
        vm.prank(owner);
        gacha.revokeRole(minterRole, minter);

        vm.prank(minter);
        vm.expectRevert();
        gacha.mint(user, COMMON, 1);
    }

    // -------------------------------------------------------------------------
    // Batch mint
    // -------------------------------------------------------------------------

    function test_mintBatch_mintsEachRarity() public {
        uint256[] memory ids = new uint256[](3);
        uint256[] memory amounts = new uint256[](3);
        ids[0] = COMMON;
        ids[1] = RARE;
        ids[2] = EPIC;
        amounts[0] = 1;
        amounts[1] = 2;
        amounts[2] = 3;

        vm.expectEmit(true, false, false, true);
        emit CapsuleMinted(user, COMMON, 1);
        vm.expectEmit(true, false, false, true);
        emit CapsuleMinted(user, RARE, 2);
        vm.expectEmit(true, false, false, true);
        emit CapsuleMinted(user, EPIC, 3);

        vm.prank(minter);
        gacha.mintBatch(user, ids, amounts);

        assertEq(gacha.balanceOf(user, COMMON), 1);
        assertEq(gacha.balanceOf(user, RARE), 2);
        assertEq(gacha.balanceOf(user, EPIC), 3);
    }

    function test_mintBatch_revertsOnLengthMismatch() public {
        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = COMMON;
        ids[1] = RARE;
        amounts[0] = 1;

        vm.prank(minter);
        vm.expectRevert("Length mismatch");
        gacha.mintBatch(user, ids, amounts);
    }

    function test_mintBatch_revertsIfAnyRarityDisabled() public {
        vm.prank(owner);
        gacha.setRarityEnabled(RARE, false);

        uint256[] memory ids = new uint256[](2);
        uint256[] memory amounts = new uint256[](2);
        ids[0] = COMMON;
        ids[1] = RARE;
        amounts[0] = 1;
        amounts[1] = 1;

        vm.prank(minter);
        vm.expectRevert("Rarity not enabled");
        gacha.mintBatch(user, ids, amounts);

        assertEq(gacha.balanceOf(user, COMMON), 0);
    }

    function test_mintBatch_revertsForStranger() public {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = COMMON;
        amounts[0] = 1;

        vm.prank(stranger);
        vm.expectRevert();
        gacha.mintBatch(user, ids, amounts);
    }

    function test_mintBatch_emptyArraysSucceed() public {
        uint256[] memory ids = new uint256[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.prank(minter);
        gacha.mintBatch(user, ids, amounts);
    }

    function testFuzz_mintBatch_singleRarity(uint8 rarity, uint96 amount) public {
        rarity = uint8(bound(rarity, 0, 2));
        amount = uint96(bound(amount, 1, 100_000));

        uint256[] memory ids = new uint256[](1);
        uint256[] memory amounts = new uint256[](1);
        ids[0] = rarity;
        amounts[0] = amount;

        vm.prank(minter);
        gacha.mintBatch(user, ids, amounts);
        assertEq(gacha.balanceOf(user, rarity), amount);
    }

    // -------------------------------------------------------------------------
    // Burn
    // -------------------------------------------------------------------------

    function test_burn_asHolder() public {
        vm.prank(minter);
        gacha.mint(user, COMMON, 3);

        vm.prank(user);
        gacha.burn(user, COMMON, 1);

        assertEq(gacha.balanceOf(user, COMMON), 2);
    }

    function test_burn_asApprovedOperator() public {
        vm.prank(minter);
        gacha.mint(user, COMMON, 2);

        vm.prank(user);
        gacha.setApprovalForAll(stranger, true);

        vm.prank(stranger);
        gacha.burn(user, COMMON, 2);

        assertEq(gacha.balanceOf(user, COMMON), 0);
    }

    function test_burn_revertsForUnapproved() public {
        vm.prank(minter);
        gacha.mint(user, COMMON, 1);

        vm.prank(stranger);
        vm.expectRevert("ERC1155: caller is not token owner or approved");
        gacha.burn(user, COMMON, 1);
    }
}
