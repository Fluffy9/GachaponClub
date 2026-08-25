// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/// @dev Per-chain capsule prices and Chainlink VRF v2.5 settings.
///      Confirm VRF addresses against
///      https://docs.chain.link/vrf/v2-5/supported-networks before deploy.
///      Ethereum mainnet capsule prices are 10x L2.
library ChainConfig {
    uint256 internal constant COMMON_L2 = 0.01 ether;
    uint256 internal constant RARE_L2 = 0.05 ether;
    uint256 internal constant EPIC_L2 = 0.1 ether;

    uint256 internal constant ETH_PRICE_MULTIPLIER = 10;

    uint256 internal constant COMMON_ETH = COMMON_L2 * ETH_PRICE_MULTIPLIER;
    uint256 internal constant RARE_ETH = RARE_L2 * ETH_PRICE_MULTIPLIER;
    uint256 internal constant EPIC_ETH = EPIC_L2 * ETH_PRICE_MULTIPLIER;

    uint256 internal constant ETHEREUM_MAINNET = 1;
    uint256 internal constant OPTIMISM = 10;
    uint256 internal constant BASE = 8453;
    uint256 internal constant ARBITRUM = 42161;

    uint32 internal constant VRF_CALLBACK_GAS = 250_000;

    address internal constant ETH_VRF_COORDINATOR = 0xD7f86b4b8Cae7D942340FF628F82735b7a20893a;
    bytes32 internal constant ETH_VRF_KEY_HASH_200_GWEI =
        0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9;
    uint16 internal constant ETH_VRF_CONFIRMATIONS = 3;

    address internal constant OP_VRF_COORDINATOR = 0x5FE58960F730153eb5A84a47C51BD4E58302E1c8;
    bytes32 internal constant OP_VRF_KEY_HASH_2_GWEI =
        0xa16a2316f92fa0abfd0029eea74e947d0613728e934d9794cd78bc02e2f69de4;
    uint16 internal constant OP_VRF_CONFIRMATIONS = 0;

    address internal constant BASE_VRF_COORDINATOR = 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634;
    bytes32 internal constant BASE_VRF_KEY_HASH_2_GWEI =
        0x00b81b5a830cb0a4009fbd8904de511e28631e62ce5ad231373d3cdad373ccab;
    uint16 internal constant BASE_VRF_CONFIRMATIONS = 0;

    address internal constant ARB_VRF_COORDINATOR = 0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e;
    bytes32 internal constant ARB_VRF_KEY_HASH_2_GWEI =
        0x9e9e46732b32662b9adc6f3abdf6c5e926a666d174a4d6b8e39c4cca76a38897;
    uint16 internal constant ARB_VRF_CONFIRMATIONS = 1;

    function isEthereumMainnet(uint256 chainId) internal pure returns (bool) {
        return chainId == ETHEREUM_MAINNET;
    }

    function commonPrice(uint256 chainId) internal pure returns (uint256) {
        return isEthereumMainnet(chainId) ? COMMON_ETH : COMMON_L2;
    }

    function rarePrice(uint256 chainId) internal pure returns (uint256) {
        return isEthereumMainnet(chainId) ? RARE_ETH : RARE_L2;
    }

    function epicPrice(uint256 chainId) internal pure returns (uint256) {
        return isEthereumMainnet(chainId) ? EPIC_ETH : EPIC_L2;
    }

    function vrfCoordinator(uint256 chainId) internal pure returns (address) {
        if (chainId == ETHEREUM_MAINNET) return ETH_VRF_COORDINATOR;
        if (chainId == OPTIMISM) return OP_VRF_COORDINATOR;
        if (chainId == BASE) return BASE_VRF_COORDINATOR;
        if (chainId == ARBITRUM) return ARB_VRF_COORDINATOR;
        revert("unsupported chain");
    }

    function vrfKeyHash(uint256 chainId) internal pure returns (bytes32) {
        if (chainId == ETHEREUM_MAINNET) return ETH_VRF_KEY_HASH_200_GWEI;
        if (chainId == OPTIMISM) return OP_VRF_KEY_HASH_2_GWEI;
        if (chainId == BASE) return BASE_VRF_KEY_HASH_2_GWEI;
        if (chainId == ARBITRUM) return ARB_VRF_KEY_HASH_2_GWEI;
        revert("unsupported chain");
    }

    function vrfConfirmations(uint256 chainId) internal pure returns (uint16) {
        if (chainId == ETHEREUM_MAINNET) return ETH_VRF_CONFIRMATIONS;
        if (chainId == OPTIMISM) return OP_VRF_CONFIRMATIONS;
        if (chainId == BASE) return BASE_VRF_CONFIRMATIONS;
        if (chainId == ARBITRUM) return ARB_VRF_CONFIRMATIONS;
        revert("unsupported chain");
    }
}
