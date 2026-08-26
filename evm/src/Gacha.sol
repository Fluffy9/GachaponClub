// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GachaNFT
 * @dev One capsule collection per rarity. The machine mints and burns token id 0.
 *      Extra ids can be added by the admin; they are unused by GachaMachine.
 */
contract GachaNFT is ERC1155Burnable, AccessControl {
    event CapsuleMinted(address indexed to, uint256 rarityId, uint256 amount);
    event RarityAdded(uint256 indexed rarityId);

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant CAPSULE_ID = 0;

    mapping(uint256 => bool) public rarityExists;
    mapping(uint256 => bool) public enabledRarities;

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

    function mint(
        address to,
        uint256 rarityId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        require(enabledRarities[rarityId], "Rarity not enabled");
        _mint(to, rarityId, amount, "");
        emit CapsuleMinted(to, rarityId, amount);
    }

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

    function setRarityEnabled(
        uint256 rarityId,
        bool enabled
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(rarityExists[rarityId], "Rarity does not exist");
        enabledRarities[rarityId] = enabled;
    }
}
