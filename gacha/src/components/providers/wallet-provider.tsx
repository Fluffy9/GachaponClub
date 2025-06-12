import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWallet as useSuiWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiObjectResponse } from '@mysten/sui/client';
import type { WalletType, TokenBalance, NFT } from '../../lib/wallet-context';
import { NETWORK, NFT_MODULES, SUI_MACHINE_ID, getImageUrl } from '../../lib/constants';
import { coinWithBalance } from '@mysten/sui/transactions';

// Initialize SuiClient with the correct network
const suiClient = new SuiClient({
    url: NETWORK === 'testnet'
        ? 'https://fullnode.testnet.sui.io:443'
        : 'https://fullnode.mainnet.sui.io:443'
});

type PrizeType = "epic" | "rare" | "common";

interface Prize {
    name: string;
    type: PrizeType;
    imageUrl: string;
    description: string;
    probability: number;
    nftType: string;
    count: number;
}

interface PrizeFields {
    name: string;
    tier: string;
    image_url: string;
    description: string;
    probability: string;
}

export interface WalletContextType {
    walletType: WalletType;
    address: string | null;
    isConnected: boolean;
    chain: string | null;
    balances: TokenBalance[];
    nfts: NFT[];
    approvedNFTs: Array<{
        type: string;
        tier: string;
        name: string;
        module: string;
        packageId: string;
        imageUrl: string;
        description: string;
    }>;
    prizePool: Prize[];
    connect: (type: WalletType) => Promise<void>;
    disconnect: () => void;
    callContract: (params: {
        chain: 'sui' | 'eth',
        contractAddress: string,
        method: string,
        args: any[],
        options?: any
    }) => Promise<any>;
    freeMintNFT: (nftType: 'bear' | 'cat' | 'unicorn') => Promise<any>;
    isCallingContract: boolean;
    contractCallSuccess: boolean;
    contractCallError: string | null;
    suiClient: SuiClient;
    suiWallet: any;
    wallet: {
        signTransaction: (transaction: Transaction) => Promise<any>;
    };
    fetchApprovedNFTs: () => Promise<void>;
    fetchPrizePool: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [walletType, setWalletType] = useState<WalletType>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [chain, setChain] = useState<string | null>(null);
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [approvedNFTs, setApprovedNFTs] = useState<Array<{
        type: string;
        tier: string;
        name: string;
        module: string;
        packageId: string;
        imageUrl: string;
        description: string;
    }>>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isCallingContract, setIsCallingContract] = useState(false);
    const [contractCallSuccess, setContractCallSuccess] = useState(false);
    const [contractCallError, setContractCallError] = useState<string | null>(null);
    const [prizePool, setPrizePool] = useState<Prize[]>([]);

    // Sui wallet hooks
    const suiWallet = useSuiWallet();
    const {
        connected: suiConnected,
        connecting: suiConnecting,
        select: suiSelect,
        account: suiAccount,
    } = suiWallet;

    // Fetch approved NFTs from the machine
    const fetchApprovedNFTs = async () => {
        try {
            console.log('=== Starting fetchApprovedNFTs in wallet provider ===');
            console.log('Fetching machine object with ID:', SUI_MACHINE_ID);

            const machine = await suiClient.getObject({
                id: SUI_MACHINE_ID,
                options: { showContent: true }
            });

            console.log('=== Machine Object in wallet provider ===');
            console.log('Raw machine object:', JSON.stringify(machine, null, 2));

            if (!machine.data) {
                console.error('No data received from machine object');
                setApprovedNFTs([]);
                return;
            }

            if ('error' in machine) {
                console.error('Error fetching machine object:', machine.error);
                setApprovedNFTs([]);
                return;
            }

            if (machine.data.content?.dataType !== 'moveObject') {
                console.error('Invalid machine object type:', machine.data.content?.dataType);
                setApprovedNFTs([]);
                return;
            }

            const fields = machine.data.content.fields as {
                approved_nft_list: Array<{
                    type: string;
                    fields: {
                        name: string;
                    };
                }>;
                approved_nfts: {
                    fields: {
                        id: { id: string };
                    };
                };
            };

            console.log('=== Approved NFTs Data in wallet provider ===');
            console.log('Approved NFT List:', fields.approved_nft_list);

            if (!fields.approved_nft_list) {
                console.error('No approved_nft_list found in machine object');
                setApprovedNFTs([]);
                return;
            }

            // Get the table ID for approved_nfts
            const tableId = fields.approved_nfts.fields.id.id;
            console.log('Approved NFTs Table ID:', tableId);

            // Transform the data to include more details and fetch metadata
            const transformedNFTs = await Promise.all(fields.approved_nft_list.map(async nft => {
                console.log(`\n=== Processing NFT Type: ${nft.fields.name} ===`);

                // Parse the type name (e.g., "0x123::module::Struct")
                const [packageId, moduleName, structName] = nft.fields.name.split('::');
                console.log('Parsed NFT type:', { packageId, moduleName, structName });

                // Get the tier from the approved_nfts table
                let tier = 'N/A'; // Default tier
                try {
                    console.log(`\n=== Fetching tier for NFT: ${nft.fields.name} ===`);
                    const tableEntry = await suiClient.getDynamicFieldObject({
                        parentId: tableId,
                        name: {
                            type: '0x1::type_name::TypeName',
                            value: nft.fields.name
                        }
                    });

                    if (tableEntry.data?.content?.dataType === 'moveObject') {
                        const fields = tableEntry.data.content.fields as any;
                        console.log('Tier value from table:', fields.value);

                        if (fields.value) {
                            // The value is already an array of numbers, no need to split
                            const decodedTier = new TextDecoder().decode(new Uint8Array(fields.value));
                            console.log('Decoded tier:', decodedTier);

                            if (decodedTier === 'common' || decodedTier === 'rare' || decodedTier === 'epic') {
                                tier = decodedTier;
                                console.log('Successfully set tier to:', tier);
                            } else {
                                console.warn(`Invalid tier value: ${decodedTier}`);
                            }
                        } else {
                            console.warn('No tier value found in table entry');
                        }
                    } else {
                        console.warn('Invalid table entry type:', tableEntry.data?.content?.dataType);
                    }
                } catch (error) {
                    console.warn(`Failed to fetch tier:`, error);
                }

                // Fetch metadata for this NFT type
                let metadata = {
                    name: structName || 'Unknown',
                    imageUrl: '',
                    description: ''
                };

                try {
                    console.log(`\nFetching metadata for NFT type: ${nft.fields.name}`);

                    // Try to get the NFT's metadata from the module's dynamic fields
                    const dynamicFields = await suiClient.getDynamicFields({
                        parentId: packageId,
                    });

                    // Look for metadata in dynamic fields
                    for (const field of dynamicFields.data) {
                        if (field.name.type === `${moduleName}::metadata`) {
                            const metadataObject = await suiClient.getObject({
                                id: field.objectId,
                                options: { showContent: true }
                            });

                            if (metadataObject.data?.content?.dataType === 'moveObject') {
                                const metadataFields = metadataObject.data.content.fields as any;
                                metadata = {
                                    name: metadataFields.name || structName,
                                    imageUrl: metadataFields.image_url || getImageUrl(`/${moduleName.toLowerCase()}.png`),
                                    description: metadataFields.description || `A ${structName} NFT`
                                };
                                break;
                            }
                        }
                    }

                    // If no metadata found in dynamic fields, use default values
                    if (!metadata.imageUrl) {
                        metadata = {
                            name: structName || 'Unknown',
                            imageUrl: getImageUrl(`/${moduleName.toLowerCase()}.png`),
                            description: `A ${structName} NFT`
                        };
                    }
                } catch (error) {
                    console.warn(`Failed to fetch metadata for ${nft.fields.name}:`, error);
                    // Set default metadata if fetch fails
                    metadata = {
                        name: structName || 'Unknown',
                        imageUrl: getImageUrl(`/${moduleName.toLowerCase()}.png`),
                        description: `A ${structName} NFT`
                    };
                }

                const transformedNFT = {
                    type: nft.fields.name,
                    tier: tier,
                    name: metadata.name,
                    module: moduleName || 'Unknown',
                    packageId: packageId || 'Unknown',
                    imageUrl: metadata.imageUrl,
                    description: metadata.description
                };
                console.log('Final transformed NFT:', transformedNFT);
                return transformedNFT;
            }));

            console.log('\n=== Final Transformed NFTs in wallet provider ===');
            console.log('Transformed NFTs:', transformedNFTs);

            setApprovedNFTs(transformedNFTs);
        } catch (error) {
            console.error('Failed to fetch approved NFTs in wallet provider:', error);
            setApprovedNFTs([]);
        }
    };

    const fetchPrizePool = async () => {
        try {
            console.log('=== Starting fetchPrizePool ===');

            const machineObject = await suiClient.getObject({
                id: SUI_MACHINE_ID,
                options: { showContent: true }
            });

            console.log('Machine object response:', JSON.stringify(machineObject, null, 2));

            const content = machineObject.data?.content;
            if (!content || content.dataType !== 'moveObject' || !('fields' in content)) {
                console.error('Invalid or missing machine object content');
                setPrizePool([]);
                return;
            }

            const fields = content.fields as {
                prize_pool: {
                    fields: {
                        common_prizes: { fields: { id: { id: string }; size: string } };
                        rare_prizes: { fields: { id: { id: string }; size: string } };
                        epic_prizes: { fields: { id: { id: string }; size: string } };
                    }
                }
            };

            const commonBagId = fields.prize_pool.fields.common_prizes.fields.id.id;
            const rareBagId = fields.prize_pool.fields.rare_prizes.fields.id.id;
            const epicBagId = fields.prize_pool.fields.epic_prizes.fields.id.id;

            console.log('Bag IDs and sizes:', {
                commonBagId,
                rareBagId,
                epicBagId
            });

            const [commonPrizes, rarePrizes, epicPrizes] = await Promise.all([
                fetchPrizesFromBag(commonBagId, 'common'),
                fetchPrizesFromBag(rareBagId, 'rare'),
                fetchPrizesFromBag(epicBagId, 'epic')
            ]);

            const allPrizes = [...commonPrizes, ...rarePrizes, ...epicPrizes];
            console.log('All fetched prizes:', allPrizes);
            setPrizePool(allPrizes);
        } catch (error) {
            console.error('Failed to fetch prize pool:', error);
            setPrizePool([]);
        }
    };

    const fetchPrizesFromBag = async (bagId: string, tier: string): Promise<Prize[]> => {
        try {
            console.log(`Fetching prizes from ${tier} bag: ${bagId}`);

            const dynamicFields = await suiClient.getDynamicFields({ parentId: bagId });

            if (!dynamicFields.data || dynamicFields.data.length === 0) {
                console.log(`No dynamic fields found in ${tier} bag`);
                return [];
            }

            const nftCounts: Record<string, number> = {};

            // First pass: count all NFTs of each type
            for (const field of dynamicFields.data) {
                try {
                    const prizeObject = await suiClient.getObject({
                        id: field.objectId,
                        options: { showContent: true }
                    });

                    const prizeContent = prizeObject.data?.content;
                    if (!prizeContent || prizeContent.dataType !== 'moveObject' || !('fields' in prizeContent)) {
                        console.warn(`Skipping: Invalid prize object content`, prizeObject);
                        continue;
                    }

                    const fields = prizeContent.fields as {
                        value: {
                            fields: {
                                nft_type?: { fields: { name: string } };
                                tier?: number[];
                            }
                        }
                    };

                    const nft_type = fields.value.fields.nft_type?.fields?.name;
                    if (!nft_type) {
                        console.warn(`Skipping malformed prize:`, fields);
                        continue;
                    }

                    const [pkg, module, name] = nft_type.split("::");
                    const nftKey = `${module}::${name}`;
                    nftCounts[nftKey] = (nftCounts[nftKey] || 0) + 1;
                } catch (err) {
                    console.error(`Error counting ${tier} prize object:`, err);
                }
            }

            // Calculate total NFTs in this tier
            const totalNFTsInTier = Object.values(nftCounts).reduce((sum, count) => sum + count, 0);

            // Second pass: create prize objects with correct probabilities
            const prizePromises = dynamicFields.data.map(async (field) => {
                try {
                    const prizeObject = await suiClient.getObject({
                        id: field.objectId,
                        options: { showContent: true }
                    });

                    const prizeContent = prizeObject.data?.content;
                    if (!prizeContent || prizeContent.dataType !== 'moveObject' || !('fields' in prizeContent)) {
                        console.warn(`Skipping: Invalid prize object content`, prizeObject);
                        return null;
                    }

                    const fields = prizeContent.fields as {
                        value: {
                            fields: {
                                nft_type?: { fields: { name: string } };
                                tier?: number[];
                            }
                        }
                    };

                    const nft_type = fields.value.fields.nft_type?.fields?.name;
                    const tierBytes = fields.value.fields.tier;

                    if (!nft_type || !tierBytes || !Array.isArray(tierBytes)) {
                        console.warn(`Skipping malformed prize:`, fields);
                        return null;
                    }

                    const [pkg, module, name] = nft_type.split("::");
                    const prizeTier = new TextDecoder().decode(Uint8Array.from(tierBytes)).toLowerCase() as PrizeType;
                    const nftKey = `${module}::${name}`;

                    return {
                        name: `${name} (${nftCounts[nftKey]})`,
                        type: prizeTier,
                        imageUrl: getImageUrl(`/${module.toLowerCase()}.png`),
                        description: `A ${prizeTier} tier ${name} from ${module}`,
                        probability: nftCounts[nftKey] / totalNFTsInTier,
                        nftType: nft_type,
                        count: nftCounts[nftKey]
                    };
                } catch (err) {
                    console.error(`Error fetching ${tier} prize object:`, err);
                    return null;
                }
            });

            const prizes = (await Promise.all(prizePromises)).filter((p): p is Prize => p !== null);
            return prizes;
        } catch (error) {
            console.error(`Error fetching prizes from ${tier} bag:`, error);
            return [];
        }
    };

    // Update wallet state when connections change
    useEffect(() => {
        if (!isInitialized) {
            setIsInitialized(true);
            return;
        }

        if (suiConnected && suiAccount) {
            setWalletType('sui');
            setAddress(suiAccount.address);
            setChain('sui');

            // Fetch SUI balance
            const fetchBalance = async () => {
                try {
                    const coins = await suiClient.getCoins({
                        owner: suiAccount.address,
                        coinType: '0x2::sui::SUI'
                    });

                    const totalBalance = coins.data.reduce((sum: bigint, coin: { balance: string }) =>
                        sum + BigInt(coin.balance), 0n);
                    setBalances([{
                        symbol: 'SUI',
                        amount: totalBalance.toString(),
                        decimals: 9
                    }]);
                } catch (error) {
                    console.error('Failed to fetch SUI balance:', error);
                    setBalances([{
                        symbol: 'SUI',
                        amount: '0',
                        decimals: 9
                    }]);
                }
            };

            // Fetch NFTs
            const fetchNFTs = async () => {
                try {
                    const objects = await suiClient.getOwnedObjects({
                        owner: suiAccount.address,
                        options: { showContent: true }
                    });

                    const nftObjects = objects.data
                        .filter((obj: SuiObjectResponse) =>
                            obj.data?.content?.dataType === 'moveObject')
                        .map((obj: SuiObjectResponse) => {
                            const content = obj.data?.content as {
                                dataType: 'moveObject';
                                type: string;
                                fields: Record<string, any>;
                            };
                            return {
                                id: content?.fields?.id?.id || '',
                                name: content?.fields?.name || 'Unknown NFT',
                                imageUrl: content?.fields?.image_url || '',
                                collection: content?.fields?.collection || '',
                                type: content?.type || ''
                            };
                        });

                    setNfts(nftObjects);
                } catch (error) {
                    console.error('Failed to fetch NFTs:', error);
                    setNfts([]);
                }
            };

            // Fetch NFTs, approved NFTs, and prize pool
            const fetchData = async () => {
                await Promise.all([
                    fetchApprovedNFTs(),
                    fetchNFTs(),
                    fetchPrizePool()
                ]);
            };

            fetchBalance();
            fetchData();
        } else {
            setWalletType(null);
            setAddress(null);
            setChain(null);
            setBalances([]);
            setNfts([]);
            setApprovedNFTs([]);
            setPrizePool([]);
        }
    }, [suiConnected, suiAccount, isInitialized, suiClient]);

    const connect = async (type: WalletType) => {
        if (type === 'sui' && suiSelect) {
            try {
                await suiSelect('Slush');
            } catch (error) {
                console.error('Failed to connect Sui wallet:', error);
            }
        }
    };

    const disconnect = () => {
        if (walletType === 'sui' && suiWallet) {
            suiWallet.disconnect();
        }
        setWalletType(null);
        setAddress(null);
        setChain(null);
        setBalances([]);
        setNfts([]);
        setApprovedNFTs([]);
        setPrizePool([]);
    };
    const callContract = async (params: {
        chain: 'sui' | 'eth';
        contractAddress: string;
        method: string;
        args: any[];
        options?: any;
    }) => {
        try {
            setIsCallingContract(true);
            setContractCallError(null);
            setContractCallSuccess(false);

            if (params.chain !== 'sui') {
                throw new Error('Ethereum functionality is currently disabled');
            }

            if (!suiWallet || !suiWallet.account?.address) {
                throw new Error('Sui wallet not found or not connected');
            }

            const address = suiWallet.account.address;
            const tx = new Transaction();
            tx.setSender(address);

            const [module, functionName] = params.method.split('::');

            // Handle pre-built transaction
            if (params.options?.transaction) {
                const txResult = await suiWallet.signAndExecuteTransaction({
                    transaction: params.options.transaction,
                });
                setContractCallSuccess(true);
                return txResult;
            }

            // Mint-specific flow
            if (functionName.startsWith('mint_')) {
                const machineId = params.args[0];
                const amount = BigInt(params.args[1]);


                const [paymentCoin] = tx.splitCoins(tx.gas, [amount]);

                const moveCall = tx.moveCall({
                    target: `${params.contractAddress}::${module}::${functionName}`,
                    arguments: [tx.object(machineId), paymentCoin],
                });

                tx.transferObjects([moveCall], tx.pure.address(address));
            } else {
                // Handle non-mint move calls
                tx.moveCall({
                    target: `${params.contractAddress}::${module}::${functionName}`,
                    arguments: params.args.map(arg => {
                        if (typeof arg === 'string' && arg.startsWith('0x')) return tx.object(arg);
                        if (typeof arg === 'string') return tx.pure.string(arg);
                        if (typeof arg === 'bigint') return tx.pure.u64(arg);
                        if (typeof arg === 'number') return tx.pure.u64(BigInt(arg));
                        return arg;
                    }),
                });
            }
            const builtTx = await tx.build({ client: suiClient });


            // Execute the transaction directly
            const txResult = await suiWallet.signAndExecuteTransaction({
                transaction: {
                    toJSON: async () => btoa(String.fromCharCode(...builtTx))
                }
            });

            setContractCallSuccess(true);
            return txResult;

        } catch (error) {
            console.error('Contract Call Error:', error);
            setContractCallError(error instanceof Error ? error.message : 'Contract call failed');
            throw error;
        } finally {
            setIsCallingContract(false);
        }
    };

    const freeMintNFT = async (nftType: 'bear' | 'cat' | 'unicorn') => {
        try {
            setIsCallingContract(true);
            setContractCallError(null);
            setContractCallSuccess(false);

            if (!suiWallet || !suiWallet.account?.address) {
                throw new Error('Sui wallet not found or not connected');
            }

            const address = suiWallet.account.address;
            const tx = new Transaction();
            tx.setSender(address);

            const moduleKey = nftType.toUpperCase() as keyof typeof NFT_MODULES;
            const modulePath = NFT_MODULES[moduleKey];
            const [packageId, moduleName] = modulePath.split('::');

            // Create the move call and transfer the result to the sender
            const moveCall = tx.moveCall({
                target: `${packageId}::${moduleName}::mint`,
                arguments: []
            });
            tx.transferObjects([moveCall], tx.pure.address(address));

            const builtTx = await tx.build({ client: suiClient });

            // Execute the transaction
            const txResult = await suiWallet.signAndExecuteTransaction({
                transaction: {
                    toJSON: async () => btoa(String.fromCharCode(...builtTx))
                }
            });

            setContractCallSuccess(true);
            return txResult;

        } catch (error) {
            console.error('Free Mint Error:', error);
            setContractCallError(error instanceof Error ? error.message : 'Free mint failed');
            throw error;
        } finally {
            setIsCallingContract(false);
        }
    };

    const value = {
        walletType,
        address,
        isConnected: Boolean(suiConnected),
        chain,
        balances,
        nfts,
        approvedNFTs,
        prizePool,
        connect,
        disconnect,
        callContract,
        freeMintNFT,
        isCallingContract,
        contractCallSuccess,
        contractCallError,
        suiClient,
        suiWallet,
        wallet: {
            signTransaction: async (transaction: Transaction) => {
                if (!suiWallet) throw new Error('Wallet not connected');
                const tx = await suiWallet.signAndExecuteTransaction({
                    transaction: transaction as unknown as { toJSON: () => Promise<string> }
                });
                return tx;
            }
        },
        fetchApprovedNFTs,
        fetchPrizePool
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
} 
