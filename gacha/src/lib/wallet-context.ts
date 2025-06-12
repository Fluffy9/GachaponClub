export type WalletType = 'sui' | 'eth' | null;

export interface TokenBalance {
    symbol: string;
    amount: string;
    decimals: number;
}

export interface NFT {
    id: string;
    name: string;
    imageUrl: string;
    collection: string;
    type: string;
    raw: string;
}

export interface RawPrizeInfo {
    type: string; // Should include 'gacha::machine::PrizeInfo'
    objectId?: string; // Optional fallback ID
    fields: {
        id: {
            id: string;
        };
        nft_type: {
            type: string; // e.g. "0x1::type_name::TypeName"
            fields: {
                name: string; // e.g. "0x2::mynft::CoolNFT"
            };
        };
        tier: number[]; // ASCII byte array, e.g. [99,111,109,109,111,110] = "common"
    };
} 