import React, { useMemo, useState, useEffect } from 'react';
import { useWallet } from './providers/wallet-provider';
import { Wallet, Gift, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import type { NFT } from '../lib/wallet-context';
import { SUI_CONTRACT_ADDRESS, getImageUrl } from '../lib/constants';
import { toast } from 'sonner';
import { formatAddress } from '../lib/utils';
import { getEvmClaimCount, fetchEvmClaims, type EvmPrizeClaim } from '../lib/evm';
import { isAddress, type Address } from 'viem';
import { loadLastPlayRequestId } from '../lib/machine-writes';
import {
    burnSuiNft,
    claimPrize,
    donateEvmNft,
    donateSuiNft,
    redeemEvmCapsule,
    redeemSuiCapsule,
    rescueStuckDraw,
} from '../lib/inventory-actions';
import { PendingClaimsPanel, RescueStuckDrawForm } from './machine-ops';

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

export function Inventory() {
    const { walletType, address, chain, nfts, approvedNFTs, callContract, fetchApprovedNFTs, fetchPrizePool, fetchNFTs, suiClient } = useWallet();
    const [activeTab, setActiveTab] = useState<'capsules' | 'nfts'>('capsules');
    const [isDonating, setIsDonating] = useState<string | null>(null);
    const [donationError, setDonationError] = useState<string | null>(null);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);
    const [redeemError, setRedeemError] = useState<string | null>(null);
    const [donationSuccess, setDonationSuccess] = useState<string | null>(null);
    const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
    const [donateContract, setDonateContract] = useState('');
    const [donateTokenId, setDonateTokenId] = useState('');
    const [donateAmount, setDonateAmount] = useState('1');
    const [donateStandard, setDonateStandard] = useState<'erc721' | 'erc1155'>('erc721');
    const [donateTier, setDonateTier] = useState<'common' | 'rare' | 'epic'>('common');
    const [rescueRequestId, setRescueRequestId] = useState('');
    const [pendingClaims, setPendingClaims] = useState<EvmPrizeClaim[]>([]);
    const [claimingIndex, setClaimingIndex] = useState<number | null>(null);

    const refreshEvmDrawState = async (owner?: string | null) => {
        if (walletType !== 'eth' || !owner) return;
        const claims = await fetchEvmClaims(owner as Address);
        setPendingClaims(claims);
        setRescueRequestId((current) => current || loadLastPlayRequestId(owner));
    };

    // Fetch data when component mounts and when activeTab changes
    useEffect(() => {
        if (address) {
            const fetchData = async () => {
                try {
                    if (walletType === 'eth') {
                        let pending = await getEvmClaimCount(address as `0x${string}`);
                        while (pending > 0) {
                            await claimPrize(callContract, 0);
                            pending -= 1;
                        }
                        await refreshEvmDrawState(address);
                    }
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
    }, [address, activeTab, walletType]);

    // Filter NFTs into capsules and other NFTs
    const { capsules, otherNfts } = useMemo(() => {
        const gachaCapsules = nfts.filter(nft =>
            walletType === 'eth'
                ? nft.collection === 'Gacha Capsules'
                : (nft.name.toLowerCase().includes('gacha') ||
                    nft.collection === 'Gacha Capsules') &&
                nft.type?.startsWith(SUI_CONTRACT_ADDRESS)
        );

        // Filter other NFTs to only show approved ones
        const prizeInfos: NFT[] = nfts
            .filter(nft => nft.type?.includes('::machine::PrizeInfo') && nft.type?.startsWith(SUI_CONTRACT_ADDRESS))
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

        const filteredNfts = nfts.filter(nft => {
            if (!nft.type) return false;

            const isApproved = approvedNFTs.some(approved =>
                approved.type === nft.type ||
                (approved.module && nft.type.includes(approved.module))
            );

            return !nft.name.toLowerCase().includes('gacha') &&
                nft.collection !== 'Gacha Capsules' &&
                isApproved &&
                nft.type.startsWith(SUI_CONTRACT_ADDRESS);
        });

        const otherNfts = [...filteredNfts, ...prizeInfos];
        return { capsules: gachaCapsules, otherNfts };
    }, [nfts, approvedNFTs, walletType]);

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

    const evmDonateTiers = useMemo(() => {
        if (!isAddress(donateContract)) return [];
        const addr = donateContract.toLowerCase();
        return approvedNFTs
            .filter((nft) => nft.type.toLowerCase() === addr)
            .map((nft) => nft.tier as 'common' | 'rare' | 'epic');
    }, [approvedNFTs, donateContract]);

    const handleEvmDonate = async () => {
        try {
            if (!address) throw new Error('Wallet not connected');
            setIsDonating(donateContract);
            setDonationError(null);
            setDonationSuccess(null);
            const { label } = await donateEvmNft({
                callContract,
                address,
                donateContract,
                donateTokenId,
                donateAmount,
                donateStandard,
                donateTier,
                allowedTiers: evmDonateTiers,
            });
            setDonationSuccess(label);
            toast.success(`${label} — you received a ${donateTier} capsule`);
            await Promise.all([
                fetchApprovedNFTs(),
                fetchPrizePool(),
                fetchNFTs(address),
            ]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to donate NFT';
            setDonationError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsDonating(null);
        }
    };

    const handleRescueStuckDraw = async () => {
        try {
            setIsRedeeming('rescue');
            setRedeemError(null);
            await rescueStuckDraw(callContract, rescueRequestId);
            toast.success('Draw rescued — claim the capsule refund below');
            await refreshEvmDrawState(address);
            if (address) await fetchNFTs(address);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to rescue draw';
            setRedeemError(message);
            toast.error(message);
        } finally {
            setIsRedeeming(null);
        }
    };

    const handlePendingClaim = async (index: number) => {
        try {
            setClaimingIndex(index);
            await claimPrize(callContract, index);
            toast.success('Prize claimed');
            await refreshEvmDrawState(address);
            if (address) await fetchNFTs(address);
            await fetchPrizePool();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to claim';
            toast.error(message);
        } finally {
            setClaimingIndex(null);
        }
    };

    const handleDonate = async (nft: NFT) => {
        if (walletType === 'eth') {
            return;
        }
        try {
            setIsDonating(nft.id);
            setDonationError(null);
            setDonationSuccess(null);
            await donateSuiNft({
                callContract,
                suiClient,
                address: address!,
                nft,
                approvedNFTs,
            });
            setDonationSuccess(`Successfully donated ${nft.name}`);
            toast.success(`Successfully donated ${nft.name}`);
            await Promise.all([
                fetchApprovedNFTs(),
                fetchPrizePool(),
                fetchNFTs(address!),
            ]);
        } catch (err) {
            console.error('Donation error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to donate NFT';
            setDonationError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsDonating(null);
        }
    };

    const handleRedeem = async (capsule: Capsule) => {
        try {
            setIsRedeeming(capsule.id);
            setRedeemError(null);
            setRedeemSuccess(null);

            if (walletType === 'eth') {
                if (!address) throw new Error('Wallet not connected');
                try {
                    await redeemEvmCapsule({
                        callContract,
                        address,
                        capsuleId: capsule.id,
                        onRequestId: (requestId) => setRescueRequestId(requestId.toString()),
                    });
                } catch (err) {
                    await refreshEvmDrawState(address);
                    throw err;
                }
                setRedeemSuccess(`Successfully redeemed ${capsule.name}`);
                toast.success(`Successfully redeemed ${capsule.name}`);
                await Promise.all([fetchPrizePool(), fetchNFTs(address)]);
                return;
            }

            await redeemSuiCapsule({
                callContract,
                address: address!,
                capsuleId: capsule.id,
                capsuleName: capsule.name,
                nfts,
            });
            setRedeemSuccess(`Successfully redeemed ${capsule.name}`);
            toast.success(`Successfully redeemed ${capsule.name}`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await Promise.all([
                fetchApprovedNFTs(),
                fetchPrizePool(),
                fetchNFTs(address!),
            ]);
        } catch (err) {
            console.error('Redeem error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to redeem capsule';
            setRedeemError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsRedeeming(null);
        }
    };

    const handleUnwrap = async (prize: NFT) => {
        try {
            setIsRedeeming(prize.id);
            setRedeemError(null);
            setRedeemSuccess(null);
            throw new Error('Unwrapping prizes is not currently supported. Please check back later.');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to unwrap prize';
            setRedeemError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsRedeeming(null);
        }
    };

    const handleBurn = async (nft: NFT) => {
        try {
            setIsDonating(nft.id);
            setDonationError(null);
            setDonationSuccess(null);
            await burnSuiNft({
                callContract,
                suiClient,
                address: address!,
                nft,
            });
            setDonationSuccess(`Successfully burned ${nft.name}`);
            toast.success(`Successfully burned ${nft.name}`);
            await Promise.all([
                fetchApprovedNFTs(),
                fetchPrizePool(),
                fetchNFTs(address!),
            ]);
        } catch (err) {
            console.error('Burn error:', err);
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
                            {walletType === 'sui' ? 'Sui' : walletType === 'eth' ? 'Base' : ''} • {chain}
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

            {walletType === 'eth' && (
                <div className="mt-4 space-y-4">
                    <PendingClaimsPanel
                        claims={pendingClaims}
                        onClaim={handlePendingClaim}
                        claimingIndex={claimingIndex}
                    />
                    <RescueStuckDrawForm
                        requestId={rescueRequestId}
                        onRequestIdChange={setRescueRequestId}
                        onRescue={handleRescueStuckDraw}
                        disabled={isRedeeming === 'rescue'}
                    />
                </div>
            )}

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
                        {walletType === 'eth' && (
                            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-3">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Donate to a bag</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Pick a bag this collection is approved for. You get one capsule of that tier.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        value={donateContract}
                                        onChange={(e) => setDonateContract(e.target.value)}
                                        placeholder="NFT contract 0x…"
                                        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                    />
                                    <input
                                        value={donateTokenId}
                                        onChange={(e) => setDonateTokenId(e.target.value)}
                                        placeholder="Token id"
                                        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                    />
                                    <select
                                        value={donateStandard}
                                        onChange={(e) => setDonateStandard(e.target.value as 'erc721' | 'erc1155')}
                                        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                    >
                                        <option value="erc721">ERC-721</option>
                                        <option value="erc1155">ERC-1155</option>
                                    </select>
                                    {donateStandard === 'erc1155' && (
                                        <input
                                            value={donateAmount}
                                            onChange={(e) => setDonateAmount(e.target.value)}
                                            placeholder="Amount"
                                            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                        />
                                    )}
                                    <select
                                        value={donateTier}
                                        onChange={(e) => setDonateTier(e.target.value as 'common' | 'rare' | 'epic')}
                                        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                    >
                                        {(evmDonateTiers.length ? evmDonateTiers : ['common', 'rare', 'epic']).map((tier) => (
                                            <option key={tier} value={tier}>
                                                {tier.charAt(0).toUpperCase() + tier.slice(1)} bag
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleEvmDonate}
                                    disabled={Boolean(isDonating) || !donateContract || !donateTokenId}
                                    className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                    {isDonating ? 'Donating…' : 'Donate'}
                                </button>
                                {donationError && <p className="text-red-500 text-sm">{donationError}</p>}
                                {donationSuccess && <p className="text-green-500 text-sm">{donationSuccess}</p>}
                            </div>
                        )}
                        <div className="flex flex-col gap-6">
                            {/* Approved NFTs Section */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Approved NFTs
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {otherNfts.filter(nft => {
                                        const approvedNFT = approvedNFTs.find(approved =>
                                            (approved.type === nft.type || nft.type.includes(approved.module)) &&
                                            nft.type.startsWith(SUI_CONTRACT_ADDRESS)
                                        );
                                        return approvedNFT && !nft.name.startsWith('Prize:');
                                    }).map((nft) => (
                                        <div key={nft.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {approvedNFTs.find(approved => approved.type === nft.type)?.imageUrl && (
                                                        <img
                                                            src={getImageUrl(approvedNFTs.find(approved => approved.type === nft.type)!.imageUrl)}
                                                            alt={nft.name}
                                                            className="w-8 h-8 object-contain"
                                                        />
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {nft.name}
                                                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                Approved
                                                            </span>
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {approvedNFTs.find(approved => approved.type === nft.type)?.tier ?
                                                                `${approvedNFTs.find(approved => approved.type === nft.type)!.tier.charAt(0).toUpperCase() + approvedNFTs.find(approved => approved.type === nft.type)!.tier.slice(1)} Tier` :
                                                                nft.collection}
                                                        </p>
                                                        <div className="flex gap-2 mt-0.5">
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                                                ID: {formatAddress(nft.id)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
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
                                                </div>
                                            </div>
                                            {donationError && isDonating === nft.id && (
                                                <p className="text-red-500 text-sm mt-2">{donationError}</p>
                                            )}
                                            {donationSuccess && isDonating === nft.id && (
                                                <p className="text-green-500 text-sm mt-2">{donationSuccess}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Prize NFTs Section */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Prize NFTs
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {otherNfts.filter(nft => nft.name.startsWith('Prize:')).map((nft) => (
                                        <div key={nft.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {nft.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {nft.collection}
                                                        </p>
                                                        <div className="flex gap-2 mt-0.5">
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                                                ID: {formatAddress(nft.id)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnwrap(nft)}
                                                    disabled={isRedeeming === nft.id}
                                                    className="px-3 py-1.5 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Gift className="w-4 h-4" />
                                                    <span>{isRedeeming === nft.id ? 'Unwrapping...' : 'Unwrap'}</span>
                                                </button>
                                            </div>
                                            {redeemError && isRedeeming === nft.id && (
                                                <p className="text-red-500 text-sm mt-2">{redeemError}</p>
                                            )}
                                            {redeemSuccess && isRedeeming === nft.id && (
                                                <p className="text-green-500 text-sm mt-2">{redeemSuccess}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Other NFTs Section */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Other NFTs (old deployments)
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {otherNfts.filter(nft => {
                                        const approvedNFT = approvedNFTs.find(approved =>
                                            (approved.type === nft.type || nft.type.includes(approved.module)) &&
                                            nft.type.startsWith(SUI_CONTRACT_ADDRESS)
                                        );
                                        return !approvedNFT && !nft.name.startsWith('Prize:');
                                    }).map((nft) => (
                                        <div key={nft.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {nft.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {nft.collection}
                                                        </p>
                                                        <div className="flex gap-2 mt-0.5">
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                                                ID: {formatAddress(nft.id)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 