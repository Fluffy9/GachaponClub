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
export const SUI_RANDOM_ID = "0x8";
export const SUI_CONTRACT_ADDRESS = '0xe3edc9895b8861ba67639e74fef65a7ab0fb238c8b62ad20d60747d55b8f9a60';
export const SUI_MACHINE_ID = '0x68c39c5fa341a9651f14b9e2db6a000c47fee9eca4c560eb901be46666d509ba';
export const SUI_MINTER_CAP_ID = '0xeb4e315b2fa5012962345830af55c31505725545362ab13253e74804c3a87270';
export const SUI_ADMIN_CAP_ID = '0xc35810e7c5ef2ed02d5dc92ce315b1292ba59392fae0a6f88cb237ff95fb85a1';
export const SUI_UPGRADE_CAP_ID = '0x39a8368814a477495d58ee5a0cf1556883beda89da90830398624c9e9afafdc6';

/** Base mainnet GachaMachine. Used for reads when no wallet is connected. */
export const EVM_MACHINE_ADDRESS = '0x3A6D915ac4Ade344ce058EbBC8BBF40B97F47BCf';
export const EVM_NFT_ADDRESSES = {
    COMMON: '0x10Fb057e34dDF5dFA36909B362c9FE40e9a62A83',
    RARE: '0x22d8526A9025bB5587936428037A4a9563A410fb',
    EPIC: '0xa56816506525e7CE7e3995183F03d207fA2dB573',
} as const;
export const EVM_RARITY_ID = {
    common: 0,
    rare: 1,
    epic: 2,
} as const;
export const BASE_RPC_URL =
    import.meta.env?.VITE_BASE_RPC_URL ??
    'https://base-mainnet.g.alchemy.com/v2/FM6pjKevbBo4z7kCribWeWXwDJxGTV0_';
export const BASE_EXPLORER_URL = 'https://basescan.org';
export const WALLETCONNECT_PROJECT_ID = 'e151333bb1826587cfaf15c54011854a';
export const EVM_DEPLOY_FROM_BLOCK = 50441000n;

/** @deprecated Use EVM_MACHINE_ADDRESS */
export const ETH_CONTRACT_ADDRESS = EVM_MACHINE_ADDRESS;

// Store old addresses for reference
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

// EVM capsule prices in wei. L2 (Arb / OP / Base) uses the contract defaults.
// Ethereum mainnet is 10x so VRF + NFT callback gas stays in range of the ticket.
const EVM_PRICES_L2 = {
    COMMON: "10000000000000000",  // 0.01 ETH
    RARE: "50000000000000000",    // 0.05 ETH
    EPIC: "100000000000000000"    // 0.1 ETH
} as const;

const EVM_PRICES_ETH_MAINNET = {
    COMMON: "100000000000000000",  // 0.1 ETH
    RARE: "500000000000000000",    // 0.5 ETH
    EPIC: "1000000000000000000"    // 1 ETH
} as const;

export const EVM_CHAIN_IDS = {
    ETHEREUM: 1,
    OP: 10,
    BASE: 8453,
    ARBITRUM: 42161
} as const;

export function getEvmPrices(chainId: number) {
    return chainId === EVM_CHAIN_IDS.ETHEREUM
        ? EVM_PRICES_ETH_MAINNET
        : EVM_PRICES_L2;
}

/** @deprecated Use getEvmPrices(chainId). Defaults to L2 prices. */
export const ETH_PRICES = EVM_PRICES_L2;

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
        COMMON: "purchase",
        RARE: "purchase",
        EPIC: "purchase"
    }
}; 