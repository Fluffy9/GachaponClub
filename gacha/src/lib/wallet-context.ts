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
} 