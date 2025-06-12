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
export const SUI_RANDOM_ID = "0x8";//'0x0000000000000000000000000000000000000000000000000000000000000006';
export const SUI_CONTRACT_ADDRESS = '0xdc6e2126390151ffa14d99e414cf821a3ef640acdf6f4891e3e570b55c4228bc';
export const SUI_MACHINE_ID = '0xc431b31498d0b958f711aac265cf6ed75efb2292f0d6fc8b68ef98831f9ac64d';
export const SUI_MINTER_CAP_ID = '0xba0a83c81c76ffb6cef3ad6161e157ef6d0577f846ac20afe31d8d2636d9fe68';
export const SUI_ADMIN_CAP_ID = '0x2396c232f61722638121eff662ed101298aefd0d88f87a83eda6cf6f1c3eb9e1';
export const SUI_UPGRADE_CAP_ID = '0x6baf6c442d4ad9921b5d8f85174b966dc356f36ccc55d3bcf17d2d58989cfd92';
export const ETH_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";


export const OLD_SUI_RANDOM_ID = "0x8";
export const OLD_SUI_CONTRACT_ADDRESS = "0xf9a4dc2f10f074c4618b44552e49b4da03af76fdcfcc1c16ab01478d6bad92e0";
export const OLD_SUI_MACHINE_ID = "0xad84024ea47de50acc6bea74f6dfd966591c3b6a467201e52d6805b6b91a51e1";
export const OLD_SUI_MINTER_CAP_ID = "0xca0c7b1f6993b44136b27e79819ea11721fccffe2b3166f23a50a104a0270758";
export const OLD_SUI_ADMIN_CAP_ID = "0x6dc73c05fffd0dc9af1d79efdb23517b5750000a3f1ab4aa503c3a3f4417c89c";
export const OLD_SUI_UPGRADE_CAP_ID = "0x196b655810fc35d588047a80642d4e6278c597615532bcb65d29993513467c26";
export const OLD_ETH_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890";

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