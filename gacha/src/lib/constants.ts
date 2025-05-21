// Network configuration
export const NETWORK = 'testnet'; // 'mainnet' or 'testnet'
export const EXPLORER_URL = NETWORK === 'testnet'
    ? 'https://testnet.suivision.xyz/'
    : 'https://suiexplorer.com';

// Image URL configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const LOCAL_PORT = 3000; // Default Next.js port
const BASE_IMAGE_URL = isDevelopment
    ? `http://localhost:${LOCAL_PORT}`
    : 'https://gachapon.club';

export function getImageUrl(path: string): string {
    if (!path) return '';

    // If it's a gachapon.club URL, use the base URL
    if (path.startsWith('https://gachapon.club/')) {
        return `${BASE_IMAGE_URL}/${path.split('/').pop()}`;
    }
    // If it's already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // If it's a relative path starting with /, remove the leading slash
    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    // Return the full URL
    return `${BASE_IMAGE_URL}/${path}`;
}

// Contract addresses
export const SUI_CONTRACT_ADDRESS = "0x4743115cdb2b555b45853fc9f326b1ed1c964c8745b12de42917bd1b50d06858";
export const SUI_MACHINE_ID = "0xc647d65891b6557e0dd47e336d486d994aba09e6e9895524fd322956348d3e7f";
export const SUI_MINTER_CAP_ID = "0x944957ab9ae187187380fb0e1856d8b18e291414f30ad50a6c698d31567667e5";
export const SUI_ADMIN_CAP_ID = "0x720961ed3f7aa8184ccc04e9ff29a2621ec49605522811207cfe8fdf774a2c5b";
export const SUI_UPGRADE_CAP_ID = "0x22ebc0cb87da9920109215094532f74c0bfaa5e752774dd8640f7caa51301565";
export const SUI_RANDOM_ID = "0x8";
export const ETH_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

// NFT Module Addresses
export const NFT_MODULES = {
    BEAR: `${SUI_CONTRACT_ADDRESS}::bear`,
    CAT: `${SUI_CONTRACT_ADDRESS}::cat`,
    UNICORN: `${SUI_CONTRACT_ADDRESS}::unicorn`,
    GACHA: `${SUI_CONTRACT_ADDRESS}::gacha_nft`,
    MACHINE: `${SUI_CONTRACT_ADDRESS}::machine`
};

// Prices in MIST (1 SUI = 1_000_000_000 MIST)
export const PRICES = {
    COMMON: 1000000000, // 1 SUI
    RARE: 5000000000,   // 5 SUI
    EPIC: 10000000000   // 10 SUI
};

// Prices in Wei (1 ETH = 1_000_000_000_000_000_000 Wei)
export const ETH_PRICES = {
    COMMON: "2000000000000000000", // 2 ETH
    RARE: "6000000000000000000",   // 6 ETH
    EPIC: "12000000000000000000"   // 12 ETH
};

// NFT Metadata
export const NFT_METADATA = {
    COMMON: {
        name: "Common Gacha NFT",
        image: getImageUrl("https://gachapon.club/common.gif")
    },
    RARE: {
        name: "Rare Gacha NFT",
        image: getImageUrl("https://gachapon.club/rare.gif")
    },
    EPIC: {
        name: "Epic Gacha NFT",
        image: getImageUrl("https://gachapon.club/epic.gif")
    }
};

// Contract Methods
export const CONTRACT_METHODS = {
    SUI: {
        COMMON: "machine::mint_common",
        RARE: "machine::mint_rare",
        EPIC: "machine::mint_epic"
    },
    ETH: {
        COMMON: "mintCommon",
        RARE: "mintRare",
        EPIC: "mintEpic"
    }
}; 