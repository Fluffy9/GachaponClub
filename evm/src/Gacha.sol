// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GachaNFT
 * @notice One ERC-1155 capsule collection per machine rarity (common / rare / epic).
 * @dev The machine mints and burns token id 0 (`CAPSULE_ID`). Extra ids can be
 *      added by the collection admin; GachaMachine never uses them.
 */
contract GachaNFT is ERC1155Burnable, AccessControl {
    event CapsuleMinted(address indexed to, uint256 rarityId, uint256 amount);
    event RarityAdded(uint256 indexed rarityId);

    /// @notice Role the machine holds so it can mint and burn capsules.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Token id used for every capsule this collection issues.
    uint256 public constant CAPSULE_ID = 0;

    /// @notice Whether `rarityId` has been registered on this collection.
    mapping(uint256 => bool) public rarityExists;
    /// @notice Whether minting is allowed for `rarityId` (id 0 starts enabled).
    mapping(uint256 => bool) public enabledRarities;

    /// @notice Deploys with metadata URI `https://gachapon.club/api/rarity/{id}.json`.
    constructor() ERC1155("https://gachapon.club/api/rarity/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _addRarity(CAPSULE_ID);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Register an extra token id. Unused by the machine.
    function addRarity(
        uint256 rarityId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _addRarity(rarityId);
    }

    function _addRarity(uint256 rarityId) internal {
        require(!rarityExists[rarityId], "Rarity already exists");
        rarityExists[rarityId] = true;
        enabledRarities[rarityId] = true;
        emit RarityAdded(rarityId);
    }

    /// @notice Mint capsules. Only the machine (or another minter) may call this.
    function mint(
        address to,
        uint256 rarityId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        require(enabledRarities[rarityId], "Rarity not enabled");
        _mint(to, rarityId, amount, "");
        emit CapsuleMinted(to, rarityId, amount);
    }

    /// @notice Batch mint. Lengths must match; each id must be enabled.
    function mintBatch(
        address to,
        uint256[] calldata rarityIds,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        require(rarityIds.length == amounts.length, "Length mismatch");

        for (uint256 i = 0; i < rarityIds.length; i++) {
            require(enabledRarities[rarityIds[i]], "Rarity not enabled");
        }

        _mintBatch(to, rarityIds, amounts, "");

        for (uint256 i = 0; i < rarityIds.length; i++) {
            emit CapsuleMinted(to, rarityIds[i], amounts[i]);
        }
    }

    /// @notice Pause or resume minting for a registered token id.
    function setRarityEnabled(
        uint256 rarityId,
        bool enabled
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(rarityExists[rarityId], "Rarity does not exist");
        enabledRarities[rarityId] = enabled;
    }
}
