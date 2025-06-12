import React, { useMemo, useState, useEffect } from 'react';
import { useWallet } from './providers/wallet-provider';
import { Wallet, Gift, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import type { NFT, RawPrizeInfo } from '../lib/wallet-context';
import { SUI_CONTRACT_ADDRESS, SUI_MACHINE_ID, SUI_RANDOM_ID, getImageUrl } from '../lib/constants';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'sonner';
import { formatAddress } from '../lib/utils';

interface Capsule extends NFT {
    quantity: number;
}

const DEFAULT_CAPSULES: Capsule[] = [
    {
        id: 'common',
        name: 'Common Capsule',
        imageUrl: getImageUrl('/capsules/common.png'),
        collection: 'Gacha Capsules',
        type: 'gacha::gacha_nft::CommonGachaNFT',
        quantity: 0,
        raw: ''
    },
    {
        id: 'rare',
        name: 'Rare Capsule',
        imageUrl: getImageUrl('/capsules/rare.png'),
        collection: 'Gacha Capsules',
        type: 'gacha::gacha_nft::RareGachaNFT',
        quantity: 0,
        raw: ''
    },
    {
        id: 'epic',
        name: 'Epic Capsule',
        imageUrl: getImageUrl('/capsules/epic.png'),
        collection: 'Gacha Capsules',
        type: 'gacha::gacha_nft::EpicGachaNFT',
        quantity: 0,
        raw: ''
    }
];

// Helper function to safely parse JSON
const safeJsonParse = (json: string): any => {
    try {
        return JSON.parse(json);
    } catch (e) {
        console.warn('Failed to parse JSON:', e);
        return {};
    }
};

// Helper function to get owner address
const getOwnerAddress = (raw: string): string => {
    const data = safeJsonParse(raw);
    debugger;
    return data?.data?.owner?.AddressOwner || '';
};

export function Inventory() {
    const { walletType, address, chain, balances, nfts, approvedNFTs, callContract, fetchApprovedNFTs, fetchPrizePool, fetchNFTs, suiClient } = useWallet();
    const [activeTab, setActiveTab] = useState<'capsules' | 'nfts'>('capsules');
    const [isDonating, setIsDonating] = useState<string | null>(null);
    const [donationError, setDonationError] = useState<string | null>(null);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
    const [redeemError, setRedeemError] = useState<string | null>(null);
    const [donationSuccess, setDonationSuccess] = useState<string | null>(null);
    const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

    // Fetch data when component mounts and when activeTab changes
    useEffect(() => {
        if (address) {
            const fetchData = async () => {
                try {
                    await Promise.all([
                        fetchApprovedNFTs(),
                        fetchPrizePool(),
                        fetchNFTs(address)
                    ]);
                } catch (error) {
                    console.error('Error fetching inventory data:', error);
                }
            };
            fetchData();
        }
    }, [address, activeTab]);

    // Filter NFTs into capsules and other NFTs
    const { capsules, otherNfts } = useMemo(() => {
        const gachaCapsules = nfts.filter(nft =>
            nft.name.toLowerCase().includes('gacha') ||
            nft.collection === 'Gacha Capsules'
        );

        // Filter other NFTs to only show approved ones
        console.log("nfts - " + JSON.stringify(nfts))
        const prizeInfos: NFT[] = nfts
            .filter(nft => nft.type?.includes('::machine::PrizeInfo'))
            .map((prize) => {

                const fields = JSON.parse(prize.raw)?.data.content.fields;
                const prizeId = fields.id?.id;
                const nftType = fields.nft_type?.fields?.name || 'unknown::unknown';
                const tierBytes: number[] = fields.tier || [];

                // Decode ASCII values to string (e.g., [99,111,...] → "common")
                const tier = String.fromCharCode(...tierBytes);

                return {
                    id: prizeId,
                    name: `Prize: ${nftType.split('::').pop() || 'Unknown'}`,
                    collection: 'Gacha Prizes',
                    imageUrl: getImageUrl(`/nft/${tier}.png`),
                    type: nftType,
                    raw: JSON.stringify(prize)
                };
            });
        console.log(prizeInfos.map(prize => prize.type))

        const filteredNfts = nfts.filter(nft => {
            if (!nft.type) return false;

            const isApproved = approvedNFTs.some(approved =>
                approved.type === nft.type ||
                (approved.module && nft.type.includes(approved.module))
            );

            return !nft.name.toLowerCase().includes('gacha') &&
                nft.collection !== 'Gacha Capsules' &&
                isApproved;
        });

        const otherNfts = [...filteredNfts, ...prizeInfos];
        return { capsules: gachaCapsules, otherNfts };
    }, [nfts, approvedNFTs]);

    // Group capsules by name and count quantities
    const uniqueCapsules = useMemo(() => {
        const grouped = capsules.reduce<Record<string, Capsule>>((acc, capsule) => {
            // Map the NFT name to the corresponding default capsule name
            let name = capsule.name;
            if (name.toLowerCase().includes('common')) {
                name = 'Common Capsule';
            } else if (name.toLowerCase().includes('rare')) {
                name = 'Rare Capsule';
            } else if (name.toLowerCase().includes('epic')) {
                name = 'Epic Capsule';
            }

            if (!acc[name]) {
                acc[name] = {
                    ...capsule,
                    quantity: 1
                };
            } else {
                acc[name].quantity += 1;
            }
            return acc;
        }, {});

        // Merge with default capsules, preserving actual quantities
        const merged = DEFAULT_CAPSULES.reduce<Record<string, Capsule>>((acc, cap) => {
            acc[cap.name] = { ...cap };
            return acc;
        }, {});

        // Update quantities for capsules we actually own
        Object.entries(grouped).forEach(([name, capsule]) => {
            if (merged[name]) {
                merged[name].quantity = capsule.quantity;
            }
        });

        return Object.values(merged);
    }, [capsules]);

    // Format address to show only first 6 and last 4 characters
    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Format token amount with proper decimals
    const formatTokenAmount = (amount: string, decimals: number) => {
        const num = parseFloat(amount) / Math.pow(10, decimals);
        return num.toFixed(4);
    };
    const handleDonate = async (nft: NFT) => {
        try {
            console.log('Starting donation for NFT:', nft);
            setIsDonating(nft.id);
            setDonationError(null);
            setDonationSuccess(null);

            const approvedNFT = approvedNFTs.find(
                approved => approved.type === nft.type || nft.type.includes(approved.module)
            );
            console.log('Found approved NFT:', approvedNFT);

            if (!approvedNFT) {
                throw new Error('NFT type not approved for donation');
            }

            if (!['common', 'rare', 'epic'].includes(approvedNFT.tier)) {
                throw new Error(`Invalid tier: ${approvedNFT.tier}`);
            }

            const functionName = `donate_nft_${approvedNFT.tier}`;
            const typeArg = approvedNFT.type;
            console.log('Using function:', functionName, 'with type:', typeArg);

            const tx = new Transaction();
            tx.setSender(address!);

            const resultObject = tx.moveCall({
                target: `${SUI_CONTRACT_ADDRESS}::machine::${functionName}`,
                typeArguments: [typeArg],
                arguments: [
                    tx.object(SUI_MACHINE_ID), // &mut Machine
                    tx.object(nft.id)          // The donated NFT of type T
                ],
            });

            // Transfer the returned GachaNFT to the user
            tx.transferObjects([resultObject], tx.pure.address(address!));
            console.log('Transaction built:', tx);

            console.log('Calling contract with:', {
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: `machine::${functionName}`,
                args: [],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            const result = await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: `machine::${functionName}`,
                args: [],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            console.log('Raw transaction result:', result);

            // Check if we have a digest, which indicates the transaction was submitted
            if (result?.digest) {
                console.log('Transaction submitted successfully with digest:', result.digest);
                setDonationSuccess(`Successfully donated ${nft.name}`);
                toast.success(`Successfully donated ${nft.name}`);

                // Wait for transaction to be confirmed
                await suiClient.waitForTransaction({ digest: result.digest });

                // Refresh all relevant data
                await Promise.all([
                    fetchApprovedNFTs(),
                    fetchPrizePool(),
                    fetchNFTs(address!)
                ]);
                console.log('Data refresh complete');
            } else {
                console.log('Transaction failed - no digest returned');
                throw new Error('Transaction failed - no digest returned');
            }
        } catch (err) {
            console.error('Donation error:', err);
            console.error('Error details:', {
                name: err instanceof Error ? err.name : 'Unknown',
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            const errorMessage = err instanceof Error ? err.message : 'Failed to donate NFT';
            setDonationError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsDonating(null);
        }
    };

    const handleRedeem = async (capsule: Capsule) => {
        try {
            console.log('Starting redemption for capsule:', capsule);
            setIsRedeeming(capsule.id);
            setRedeemError(null);
            setRedeemSuccess(null);

            // For regular capsules, find the actual NFT to trade
            const nftToTrade = nfts.find(nft =>
                nft.name.toLowerCase().includes(capsule.id.toLowerCase()) &&
                nft.name.toLowerCase().includes('gacha')
            );

            if (!nftToTrade) {
                throw new Error('NFT not found');
            }

            const tier = capsule.id.toLowerCase();
            if (!['common', 'rare', 'epic'].includes(tier)) {
                throw new Error(`Invalid tier: ${tier}`);
            }

            const functionName = `trade_${tier}`;
            console.log('Using function:', functionName);

            // Create a transaction
            const tx = new Transaction();
            tx.setSender(address!);

            const moveCall = tx.moveCall({
                target: `${SUI_CONTRACT_ADDRESS}::machine::${functionName}`,
                arguments: [
                    tx.object(SUI_MACHINE_ID),
                    tx.object(nftToTrade.id),
                    tx.object(SUI_RANDOM_ID)
                ],
            });

            // Transfer the result to the sender
            tx.transferObjects([moveCall], tx.pure.address(address!));
            console.log('Transaction built:', tx);

            console.log('Calling contract with:', {
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: `machine::${functionName}`,
                args: [SUI_MACHINE_ID, nftToTrade.id, SUI_RANDOM_ID],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            const result = await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: `machine::${functionName}`,
                args: [SUI_MACHINE_ID, nftToTrade.id, SUI_RANDOM_ID],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            console.log('Raw transaction result:', result);

            // Check if we have a digest, which indicates the transaction was submitted
            if (result?.digest) {
                console.log('Transaction submitted successfully with digest:', result.digest);
                setRedeemSuccess(`Successfully redeemed ${capsule.name}`);
                toast.success(`Successfully redeemed ${capsule.name}`);

                // Wait for transaction to be confirmed
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Refresh all relevant data
                await Promise.all([
                    fetchApprovedNFTs(),
                    fetchPrizePool(),
                    fetchNFTs(address!)
                ]);
                console.log('Data refresh complete');
            } else {
                console.log('Transaction failed - no digest returned');
                throw new Error('Transaction failed - no digest returned');
            }
        } catch (err) {
            console.error('Redeem error:', err);
            console.error('Error details:', {
                name: err instanceof Error ? err.name : 'Unknown',
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            const errorMessage = err instanceof Error ? err.message : 'Failed to redeem capsule';
            setRedeemError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsRedeeming(null);
        }
    };

    const handleUnwrap = async (prize: NFT) => {
        try {
            console.log('Starting unwrap for prize:', prize);
            setIsRedeeming(prize.id);
            setRedeemError(null);
            setRedeemSuccess(null);

            // Create a transaction
            const tx = new Transaction();
            tx.setSender(address!);

            const moveCall = tx.moveCall({
                target: `${SUI_CONTRACT_ADDRESS}::machine::consume_prize`,
                typeArguments: [prize.type],
                arguments: [
                    tx.object(prize.id)
                ],
            });

            // Transfer the result to the sender
            tx.transferObjects([moveCall], tx.pure.address(address!));
            console.log('Transaction built:', tx);

            console.log('Calling contract with:', {
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: 'machine::consume_prize',
                args: [prize.id],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            const result = await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: 'machine::consume_prize',
                args: [prize.id],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            console.log('Raw transaction result:', result);

            // Check if we have a digest, which indicates the transaction was submitted
            if (result?.digest) {
                console.log('Transaction submitted successfully with digest:', result.digest);
                setRedeemSuccess(`Successfully unwrapped ${prize.name}`);
                toast.success(`Successfully unwrapped ${prize.name}`);

                // Wait for transaction to be confirmed
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Refresh all relevant data
                await Promise.all([
                    fetchApprovedNFTs(),
                    fetchPrizePool(),
                    fetchNFTs(address!)
                ]);
                console.log('Data refresh complete');
            } else {
                console.log('Transaction failed - no digest returned');
                throw new Error('Transaction failed - no digest returned');
            }
        } catch (err) {
            console.error('Unwrap error:', err);
            console.error('Error details:', {
                name: err instanceof Error ? err.name : 'Unknown',
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            const errorMessage = err instanceof Error ? err.message : 'Failed to unwrap prize';
            setRedeemError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsRedeeming(null);
        }
    };

    const handleBurn = async (nft: NFT) => {
        try {
            console.log('Starting burn for NFT:', nft);
            setIsDonating(nft.id);
            setDonationError(null);
            setDonationSuccess(null);

            // Create a transaction
            const tx = new Transaction();
            tx.setSender(address!);

            // Transfer the NFT directly to the zero address
            tx.transferObjects(
                [tx.object(nft.id)],
                tx.pure.address('0x0000000000000000000000000000000000000000000000000000000000000000')
            );
            console.log('Transaction built:', tx);

            console.log('Calling contract with:', {
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: 'transferObjects',
                args: [nft.id, '0x0000000000000000000000000000000000000000000000000000000000000000'],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            const result = await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: 'transferObjects',
                args: [nft.id, '0x0000000000000000000000000000000000000000000000000000000000000000'],
                options: {
                    transaction: tx,
                    gasBudget: 100000000
                }
            });

            console.log('Raw transaction result:', result);

            // Check if we have a digest, which indicates the transaction was submitted
            if (result?.digest) {
                console.log('Transaction submitted successfully with digest:', result.digest);
                setDonationSuccess(`Successfully burned ${nft.name}`);
                toast.success(`Successfully burned ${nft.name}`);

                // Wait for transaction to be confirmed
                await suiClient.waitForTransaction({ digest: result.digest });

                // Refresh all relevant data
                await Promise.all([
                    fetchApprovedNFTs(),
                    fetchPrizePool(),
                    fetchNFTs(address!)
                ]);
                console.log('Data refresh complete');
            } else {
                console.log('Transaction failed - no digest returned');
                throw new Error('Transaction failed - no digest returned');
            }
        } catch (err) {
            console.error('Burn error:', err);
            console.error('Error details:', {
                name: err instanceof Error ? err.name : 'Unknown',
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined
            });
            const errorMessage = err instanceof Error ? err.message : 'Failed to burn NFT';
            setDonationError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsDonating(null);
        }
    };

    if (!address) return null;

    return (
        <div className="flex flex-col gap-6">
            {/* Wallet Info */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#b480e4] dark:bg-[#9d6ad0] flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatAddress(address || '')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {walletType === 'sui' ? 'Sui' : walletType === 'eth' ? 'Ethereum' : ''} • {chain}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('capsules')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'capsules'
                        ? 'text-[#b480e4] dark:text-[#c99df0] border-b-2 border-[#b480e4] dark:border-[#c99df0]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Capsules
                </button>
                <button
                    onClick={() => setActiveTab('nfts')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'nfts'
                        ? 'text-[#b480e4] dark:text-[#c99df0] border-b-2 border-[#b480e4] dark:border-[#c99df0]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Other NFTs
                </button>
            </div>

            {/* Content */}
            <div className="mt-4">
                {activeTab === 'capsules' ? (
                    <>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Your Capsules
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {uniqueCapsules.map((capsule) => (
                                <div key={capsule.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img
                                                    src={`/${capsule.id}.gif`}
                                                    alt={capsule.name}
                                                    className="w-12 h-12 rounded-2xl object-cover"
                                                />
                                                <div className="absolute -top-2 -right-2 bg-[#b480e4] dark:bg-[#9d6ad0] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                    {capsule.quantity}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {capsule.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {capsule.id.charAt(0).toUpperCase() + capsule.id.slice(1)} Capsule
                                                </p>
                                                <div className="flex gap-2 mt-0.5">
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                                        ID: {formatAddress(capsule.id)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => capsule.name.startsWith('Prize:') ? handleUnwrap(capsule) : handleRedeem(capsule)}
                                            disabled={isRedeeming === capsule.id || capsule.quantity === 0}
                                            className="px-3 py-1.5 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {capsule.name.startsWith('Prize:') ? (
                                                <>
                                                    <Gift className="w-4 h-4" />
                                                    <span>{isRedeeming === capsule.id ? 'Unwrapping...' : 'Unwrap'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="w-4 h-4" />
                                                    <span>{isRedeeming === capsule.id ? 'Redeeming...' : 'Redeem'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {redeemError && isRedeeming === capsule.id && (
                                        <p className="text-red-500 text-sm mt-2">{redeemError}</p>
                                    )}
                                    {redeemSuccess && isRedeeming === capsule.id && (
                                        <p className="text-green-500 text-sm mt-2">{redeemSuccess}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Your NFTs
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {otherNfts.map((nft) => {
                                // Find the approved NFT type to get the tier
                                const approvedNFT = approvedNFTs.find(approved =>
                                    approved.type === nft.type ||
                                    nft.type.includes(approved.module)
                                );

                                const isPrize = nft.name.startsWith('Prize:');

                                return (
                                    <div key={nft.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {approvedNFT?.imageUrl && (
                                                    <img
                                                        src={getImageUrl(approvedNFT.imageUrl)}
                                                        alt={approvedNFT.name}
                                                        className="w-8 h-8 object-contain"
                                                    />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {nft.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {approvedNFT?.tier ? `${approvedNFT.tier.charAt(0).toUpperCase() + approvedNFT.tier.slice(1)} Tier` : nft.collection}
                                                    </p>
                                                    <div className="flex gap-2 mt-0.5">
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                                            ID: {formatAddress(nft.id)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {isPrize ? (
                                                    <button
                                                        onClick={() => handleUnwrap(nft)}
                                                        disabled={isRedeeming === nft.id}
                                                        className="px-3 py-1.5 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Gift className="w-4 h-4" />
                                                        <span>{isRedeeming === nft.id ? 'Unwrapping...' : 'Unwrap'}</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleDonate(nft)}
                                                            disabled={isDonating === nft.id}
                                                            className="p-1.5 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            aria-label="Donate NFT"
                                                        >
                                                            {isDonating === nft.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Gift className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleBurn(nft)}
                                                            disabled={isDonating === nft.id}
                                                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            aria-label="Burn NFT"
                                                        >
                                                            {isDonating === nft.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {donationError && isDonating === nft.id && (
                                            <p className="text-red-500 text-sm mt-2">{donationError}</p>
                                        )}
                                        {donationSuccess && isDonating === nft.id && (
                                            <p className="text-green-500 text-sm mt-2">{donationSuccess}</p>
                                        )}
                                        {redeemError && isRedeeming === nft.id && (
                                            <p className="text-red-500 text-sm mt-2">{redeemError}</p>
                                        )}
                                        {redeemSuccess && isRedeeming === nft.id && (
                                            <p className="text-green-500 text-sm mt-2">{redeemSuccess}</p>
                                        )}
                                    </div>
                                );
                            })}
                            {otherNfts.length === 0 && (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                                    No approved NFTs found
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 