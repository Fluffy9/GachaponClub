import { useState, createContext, useContext } from 'react';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { NETWORK } from './constants';

// Initialize SuiClient with the correct network
const suiClient = new SuiClient({
    url: NETWORK === 'mainnet'
        ? 'https://fullnode.mainnet.sui.io:443'
        : 'https://fullnode.testnet.sui.io:443'
});

// Add type declarations for wallet objects
declare global {
    interface Window {
        suiWallet?: {
            connect: () => Promise<void>;
            disconnect: () => Promise<void>;
            getAccounts: () => Promise<string[]>;
            signAndExecuteTransaction: (params: {
                transaction: Transaction;
            }) => Promise<any>;
        };
    }
}

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
}

export interface WalletContextType {
    walletType: WalletType;
    address: string | null;
    isConnected: boolean;
    chain: string | null;
    balances: TokenBalance[];
    nfts: NFT[];
    connect: (type: WalletType) => Promise<void>;
    disconnect: () => void;
    callContract: (params: {
        chain: 'sui' | 'eth',
        contractAddress: string,
        method: string,
        args: any[],
        options?: any
    }) => Promise<any>;
    isCallingContract: boolean;
    contractCallSuccess: boolean;
    contractCallError: string | null;
    suiClient: SuiClient;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [walletType, setWalletType] = useState<WalletType>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [chain, setChain] = useState<string | null>(null);
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [isCallingContract, setIsCallingContract] = useState(false);
    const [contractCallSuccess, setContractCallSuccess] = useState(false);
    const [contractCallError, setContractCallError] = useState<string | null>(null);

    const connect = async (type: WalletType) => {
        try {
            if (type === 'sui') {
                // Check if Sui wallet is available
                if (!window.suiWallet) {
                    throw new Error('Sui wallet not found');
                }
                await window.suiWallet.connect();
                const accounts = await window.suiWallet.getAccounts();
                setAddress(accounts[0]);
            } else if (type === 'eth') {
                // Ethereum functionality temporarily disabled
                throw new Error('Ethereum functionality is currently disabled');
            }
            setWalletType(type);
            setIsConnected(true);
            setChain(type === 'sui' ? 'sui-testnet' : null);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    };

    const disconnect = () => {
        if (walletType === 'sui' && window.suiWallet) {
            window.suiWallet.disconnect();
        }
        setWalletType(null);
        setAddress(null);
        setIsConnected(false);
        setChain(null);
        setBalances([]);
        setNfts([]);
    };

    const callContract = async (params: {
        chain: 'sui' | 'eth',
        contractAddress: string,
        method: string,
        args: any[],
        options?: any
    }) => {
        try {
            setIsCallingContract(true);
            setContractCallError(null);
            setContractCallSuccess(false);

            if (params.chain === 'sui') {
                if (!window.suiWallet) {
                    throw new Error('Sui wallet not found');
                }

                const tx = new Transaction();
                const [module, functionName] = params.method.split('::');

                // Log the transaction details for debugging
                console.log('Sui Transaction:', {
                    target: `${params.contractAddress}::${module}::${functionName}`,
                    args: params.args
                });

                // For minting functions, we need to handle the payment coin
                if (functionName.startsWith('mint_')) {
                    // Get the payment amount from the first argument
                    const paymentAmount = params.args[0];
                    console.log('[WalletContext] Original payment amount:', {
                        value: paymentAmount,
                        type: typeof paymentAmount,
                        isBigInt: paymentAmount instanceof BigInt,
                        stringValue: paymentAmount.toString()
                    });

                    // Convert BigInt to number for splitCoins
                    const amount = typeof paymentAmount === 'bigint'
                        ? Number(paymentAmount)
                        : paymentAmount;
                    console.log('[WalletContext] Converted amount:', {
                        value: amount,
                        type: typeof amount,
                        stringValue: amount.toString()
                    });

                    // Split the gas coin to create a new coin with the exact amount
                    const [coin] = tx.splitCoins(tx.gas, [amount]);
                    // Replace the payment amount with the coin object
                    params.args[0] = coin;
                }

                // Log all arguments before processing
                console.log('[WalletContext] Arguments before processing:', params.args.map(arg => ({
                    value: arg,
                    type: typeof arg,
                    isBigInt: arg instanceof BigInt,
                    stringValue: arg?.toString()
                })));

                // Construct the move call
                tx.moveCall({
                    target: `${params.contractAddress}::${module}::${functionName}`,
                    arguments: params.args.map(arg => {
                        // Handle different argument types
                        if (typeof arg === 'string' && arg.startsWith('0x')) {
                            return tx.object(arg); // For object IDs
                        }
                        if (typeof arg === 'string') {
                            return tx.pure.string(arg); // For strings
                        }
                        if (typeof arg === 'bigint') {
                            const converted = Number(arg);
                            console.log('[WalletContext] Converting BigInt to number:', {
                                original: arg.toString(),
                                converted,
                                type: typeof converted
                            });
                            return tx.pure.u64(converted); // Convert BigInt to number for u64
                        }
                        return arg; // For other values (like coin objects)
                    })
                });

                // Execute the transaction
                const result = await window.suiWallet.signAndExecuteTransaction({
                    transaction: tx,
                });

                console.log('Transaction Result:', result);
                setContractCallSuccess(true);
                return result;
            } else if (params.chain === 'eth') {
                // Ethereum functionality temporarily disabled
                throw new Error('Ethereum functionality is currently disabled');
            }

            throw new Error('Unsupported chain');
        } catch (error) {
            console.error('Contract Call Error:', error);
            setContractCallError(error instanceof Error ? error.message : 'Contract call failed');
            throw error;
        } finally {
            setIsCallingContract(false);
        }
    };

    const value = {
        walletType,
        address,
        isConnected,
        chain,
        balances,
        nfts,
        connect,
        disconnect,
        callContract,
        isCallingContract,
        contractCallSuccess,
        contractCallError,
        suiClient
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

export { WalletContext }; 