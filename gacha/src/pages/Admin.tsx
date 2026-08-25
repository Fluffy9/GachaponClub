"use client"

import { useWallet } from "../components/providers/wallet-provider"
import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { ThemeToggle } from "../components/theme-toggle"
import { Navigation } from "../components/navigation"
import { WalletPopup } from "../components/wallet-popup"
import { usePopup } from "../components/ui/popup-provider"
import {
    EVM_MACHINE_ADDRESS,
    EVM_NFT_ADDRESSES,
    EVM_RARITY_ID,
    BASE_EXPLORER_URL,
    getImageUrl
} from "../lib/constants"
import { AlertCircle, Wallet, Coins, Settings, ArrowUpRight, ArrowDownLeft } from "lucide-react"
import { toast, Toaster } from 'sonner'
import { parseEther, isAddress, type Address, zeroAddress, formatEther } from 'viem'
import {
    formatEth,
    fetchEvmRarities,
    fetchEvmMachineStats,
    fetchEvmApprovedNfts,
    isEvmAdmin,
    type EvmRarity,
    type EvmMachineStats,
    type EvmApprovedNft,
    type PrizeType,
} from "../lib/evm"

const container = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
}

const item = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 20
        }
    }
}

const emptyStats: EvmMachineStats = {
    treasuryBalance: 0n,
    totalPlays: 0,
    commonMints: 0,
    rareMints: 0,
    epicMints: 0,
    commonPrizes: 0,
    rarePrizes: 0,
    epicPrizes: 0,
}

export default function Admin() {
    const { isConnected, callContract, address, walletType, evmRarities, fetchPrizePool } = useWallet();
    const { openPopup } = usePopup();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [machineStats, setMachineStats] = useState<EvmMachineStats>(emptyStats);
    const [rarities, setRarities] = useState<EvmRarity[]>([]);
    const [approvedNfts, setApprovedNfts] = useState<EvmApprovedNft[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [newNFTType, setNewNFTType] = useState("");
    const [newNFTTier, setNewNFTTier] = useState<PrizeType>("common");
    const [activeTab, setActiveTab] = useState<'nfts' | 'withdraw' | 'settings'>('nfts');
    const [prices, setPrices] = useState({ common: 0.01, rare: 0.05, epic: 0.1 });
    const [vrfFund, setVrfFund] = useState("0.005");
    const [newAdmin, setNewAdmin] = useState("");
    const [redeemRarity, setRedeemRarity] = useState<PrizeType>("common");

    useEffect(() => {
        document.title = "Admin Dashboard | Gachapon Club"
    }, []);

    const refresh = useCallback(async () => {
        try {
            const [stats, onChainRarities, approved] = await Promise.all([
                fetchEvmMachineStats(),
                fetchEvmRarities(),
                fetchEvmApprovedNfts(),
            ]);
            setMachineStats(stats);
            setRarities(onChainRarities);
            setApprovedNfts(approved);
            const nextPrices = { common: 0.01, rare: 0.05, epic: 0.1 };
            for (const rarity of onChainRarities) {
                const key = rarity.name.toLowerCase() as keyof typeof nextPrices;
                if (key in nextPrices) {
                    nextPrices[key] = Number(formatEther(rarity.price));
                }
            }
            setPrices(nextPrices);
        } catch (err) {
            console.error('Failed to load Base admin data:', err);
            toast.error('Failed to load Base machine data');
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        const checkAdmin = async () => {
            if (!address || walletType === 'sui') {
                setIsAdmin(false);
                return;
            }
            try {
                setIsAdmin(await isEvmAdmin(address as Address));
            } catch (err) {
                console.error('Failed to check admin role:', err);
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, [address, walletType]);

    const requireAdmin = () => {
        if (!isConnected || walletType === 'sui') {
            openPopup(<WalletPopup />, "Your Wallet");
            throw new Error('Connect an Ethereum wallet on Base');
        }
        if (!isAdmin) {
            throw new Error('Connected wallet is not a machine admin');
        }
    };

    const runAdmin = async (label: string, work: () => Promise<void>) => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);
            requireAdmin();
            await work();
            setSuccess(label);
            toast.success(label);
            await Promise.all([refresh(), fetchPrizePool()]);
        } catch (err) {
            const message = err instanceof Error ? err.message : label;
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNFTApproval = async (nftType: string, tier: PrizeType, isApproved: boolean) => {
        await runAdmin(isApproved ? 'NFT collection approved' : 'NFT collection unapproved', async () => {
            if (!isAddress(nftType)) {
                throw new Error('Enter an ERC721 or ERC1155 contract address');
            }
            await callContract({
                chain: 'eth',
                contractAddress: EVM_MACHINE_ADDRESS,
                method: 'approveNFT',
                args: [BigInt(EVM_RARITY_ID[tier]), nftType as Address, isApproved],
            });
            if (isApproved) setNewNFTType("");
        });
    };

    const handleWithdraw = async () => {
        await runAdmin(`Withdrew ${formatEth(machineStats.treasuryBalance)}`, async () => {
            if (machineStats.treasuryBalance === 0n) {
                throw new Error('No ETH in the machine');
            }
            await callContract({
                chain: 'eth',
                contractAddress: EVM_MACHINE_ADDRESS,
                method: 'withdraw',
                args: [zeroAddress, machineStats.treasuryBalance, address as Address],
            });
        });
    };

    const handleRedeemPrize = async () => {
        await runAdmin(`Redeemed last ${redeemRarity} prize`, async () => {
            await callContract({
                chain: 'eth',
                contractAddress: EVM_MACHINE_ADDRESS,
                method: 'redeemPrize',
                args: [BigInt(EVM_RARITY_ID[redeemRarity]), address as Address],
            });
        });
    };

    const handleUpdatePrices = async () => {
        await runAdmin('Prices updated', async () => {
            const updates: Array<[PrizeType, number]> = [
                ['common', prices.common],
                ['rare', prices.rare],
                ['epic', prices.epic],
            ];
            for (const [tier, value] of updates) {
                if (!(value > 0)) throw new Error(`${tier} price must be greater than 0`);
                await callContract({
                    chain: 'eth',
                    contractAddress: EVM_MACHINE_ADDRESS,
                    method: 'setRarityPrice',
                    args: [BigInt(EVM_RARITY_ID[tier]), parseEther(value.toString())],
                });
            }
        });
    };

    const handleToggleRarity = async (rarity: EvmRarity) => {
        await runAdmin(`${rarity.name} ${rarity.enabled ? 'disabled' : 'enabled'}`, async () => {
            await callContract({
                chain: 'eth',
                contractAddress: EVM_MACHINE_ADDRESS,
                method: 'setRarityEnabled',
                args: [BigInt(rarity.id), !rarity.enabled],
            });
        });
    };

    const handleFundVrf = async () => {
        await runAdmin(`Funded VRF with ${vrfFund} ETH`, async () => {
            const value = parseEther(vrfFund);
            if (value <= 0n) throw new Error('Enter an ETH amount');
            await callContract({
                chain: 'eth',
                contractAddress: EVM_MACHINE_ADDRESS,
                method: 'fundVrf',
                args: [],
                options: { value },
            });
        });
    };

    const handleChangeAdmin = async () => {
        await runAdmin('Admin role transferred', async () => {
            if (!isAddress(newAdmin)) throw new Error('Enter a valid address');
            if (!window.confirm(`Transfer ADMIN_ROLE to ${newAdmin}? This wallet will lose admin.`)) {
                throw new Error('Transfer cancelled');
            }
            await callContract({
                chain: 'eth',
                contractAddress: EVM_MACHINE_ADDRESS,
                method: 'changeAdmin',
                args: [newAdmin as Address],
            });
            setNewAdmin("");
        });
    };

    const writesEnabled = Boolean(isConnected && walletType !== 'sui' && isAdmin && !isLoading);
    const explorer = (path: string) => `${BASE_EXPLORER_URL}${path}`;

    const renderApprovedNFTs = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['common', 'rare', 'epic'] as PrizeType[]).map((tier) => (
                <div key={tier} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                    </h3>
                    <div className="space-y-4">
                        {approvedNfts.filter((nft) => nft.tier === tier).length > 0 ? (
                            approvedNfts.filter((nft) => nft.tier === tier).map((nft) => (
                                <div key={nft.address} className="flex items-start gap-3">
                                    <img
                                        src={getImageUrl(`/${tier}.gif`)}
                                        alt={tier}
                                        className="w-12 h-12 object-contain rounded-lg"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {nft.address.slice(0, 6)}…{nft.address.slice(-4)}
                                        </div>
                                        <a
                                            href={explorer(`/address/${nft.address}`)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-[#b480e4] dark:text-[#c99df0] break-all hover:underline"
                                        >
                                            {nft.address}
                                        </a>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">none</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <main className="min-h-screen flex flex-col items-center bg-pattern">
            <div className="w-full max-w-6xl px-4 py-6">
                <Toaster position="top-right" richColors />

                <div className="flex flex-col items-center mb-8 relative">
                    <motion.div
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="absolute right-0 top-0 md:right-4"
                    >
                        <ThemeToggle />
                    </motion.div>
                    <motion.h1
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="text-3xl font-bold text-[#b480e4] dark:text-[#c99df0] mb-2"
                    >
                        Admin Dashboard
                    </motion.h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Base mainnet</p>
                    <Navigation />
                </div>

                <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
                    {walletType === 'sui' && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                            This admin dashboard controls the Base machine. Disconnect Sui and connect Ethereum to make changes.
                        </div>
                    )}
                    {isConnected && walletType !== 'sui' && !isAdmin && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                            Connected wallet is not a machine admin. Stats still load; writes stay disabled.
                        </div>
                    )}
                    {!isConnected && (
                        <div className="p-4 bg-[#b480e4]/10 dark:bg-[#b480e4]/20 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Machine data is loaded from Base. Connect Ethereum to approve collections, set prices, or withdraw.
                            </p>
                            <button
                                onClick={() => openPopup(<WalletPopup />, "Your Wallet")}
                                className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg text-sm"
                            >
                                Connect Ethereum
                            </button>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Machine Statistics</h2>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {machineStats.totalPlays} Plays
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {formatEth(machineStats.treasuryBalance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Common / Rare / Epic mints</h3>
                                <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">
                                    {machineStats.commonMints} / {machineStats.rareMints} / {machineStats.epicMints}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Common prizes</h3>
                                <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">{machineStats.commonPrizes}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Rare prizes</h3>
                                <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">{machineStats.rarePrizes}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Epic prizes</h3>
                                <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">{machineStats.epicPrizes}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Approved NFTs Overview</h2>
                        {renderApprovedNFTs()}
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
                        {([
                            ['nfts', 'Approved NFTs'],
                            ['withdraw', 'Withdraw'],
                            ['settings', 'Settings'],
                        ] as const).map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === id
                                    ? 'text-[#b480e4] dark:text-[#c99df0] border-b-2 border-[#b480e4] dark:border-[#c99df0]'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        {activeTab === 'nfts' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Approved NFTs (Admin Only)</h2>
                                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">How to Approve NFTs</h3>
                                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                                        <li>Enter the ERC721 or ERC1155 contract address</li>
                                        <li>Select the bag it can be donated into (common, rare, or epic)</li>
                                        <li>Players still need to <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">approve</code> the machine before donating</li>
                                    </ol>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label htmlFor="nftType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                NFT contract
                                            </label>
                                            <input
                                                id="nftType"
                                                type="text"
                                                value={newNFTType}
                                                onChange={(e) => setNewNFTType(e.target.value)}
                                                placeholder="0x…"
                                                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="nftTier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Tier
                                            </label>
                                            <select
                                                id="nftTier"
                                                value={newNFTTier}
                                                onChange={(e) => setNewNFTTier(e.target.value as PrizeType)}
                                                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                            >
                                                <option value="common">Common</option>
                                                <option value="rare">Rare</option>
                                                <option value="epic">Epic</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={() => handleNFTApproval(newNFTType, newNFTTier, true)}
                                                disabled={!writesEnabled || !newNFTType}
                                                className="w-full px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? 'Approving...' : 'Approve NFT'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {approvedNfts.map((nft) => (
                                            <div key={nft.address} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg gap-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {nft.tier.charAt(0).toUpperCase() + nft.tier.slice(1)} bag
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{nft.address}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleNFTApproval(nft.address, nft.tier, false)}
                                                    disabled={!writesEnabled}
                                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Unapprove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'withdraw' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Withdraw Treasury (Admin Only)</h2>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Available Balance</p>
                                                <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0]">
                                                    {formatEth(machineStats.treasuryBalance)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleWithdraw}
                                                disabled={!writesEnabled || machineStats.treasuryBalance === 0n}
                                                className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                                {isLoading ? 'Withdrawing...' : 'Withdraw All'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Redeem last prize</h2>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bag</label>
                                            <select
                                                value={redeemRarity}
                                                onChange={(e) => setRedeemRarity(e.target.value as PrizeType)}
                                                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                            >
                                                <option value="common">Common ({machineStats.commonPrizes})</option>
                                                <option value="rare">Rare ({machineStats.rarePrizes})</option>
                                                <option value="epic">Epic ({machineStats.epicPrizes})</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleRedeemPrize}
                                            disabled={!writesEnabled}
                                            className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Redeem to my wallet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Machine Settings (Admin Only)</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(['common', 'rare', 'epic'] as PrizeType[]).map((tier) => (
                                            <div key={tier} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {tier.charAt(0).toUpperCase() + tier.slice(1)} price (ETH)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={prices[tier]}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        if (!isNaN(value) && value >= 0) {
                                                            setPrices((prev) => ({ ...prev, [tier]: value }));
                                                        }
                                                    }}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                                    min="0"
                                                    step="0.001"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4">
                                        <button
                                            onClick={handleUpdatePrices}
                                            disabled={!writesEnabled}
                                            className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? 'Updating...' : 'Update Prices'}
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Rarity status</h3>
                                    <div className="space-y-2">
                                        {(rarities.length ? rarities : evmRarities).map((rarity) => (
                                            <div key={rarity.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rarity.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatEth(rarity.price)}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleToggleRarity(rarity)}
                                                    disabled={!writesEnabled}
                                                    className={`px-3 py-1.5 rounded-lg text-sm text-white disabled:opacity-50 ${rarity.enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                                                >
                                                    {rarity.enabled ? 'Disable' : 'Enable'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Fund VRF</h3>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ETH amount</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.001"
                                                value={vrfFund}
                                                onChange={(e) => setVrfFund(e.target.value)}
                                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={handleFundVrf}
                                            disabled={!writesEnabled}
                                            className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Fund subscription
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Transfer admin</h3>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New admin address</label>
                                            <input
                                                type="text"
                                                value={newAdmin}
                                                onChange={(e) => setNewAdmin(e.target.value)}
                                                placeholder="0x…"
                                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={handleChangeAdmin}
                                            disabled={!writesEnabled || !newAdmin}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Transfer ADMIN_ROLE
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Contract Info</h3>
                                <div className="space-y-4">
                                    {[
                                        ['Connected wallet', address || 'Not connected'],
                                        ['Machine', EVM_MACHINE_ADDRESS],
                                        ['Common capsule', EVM_NFT_ADDRESSES.COMMON],
                                        ['Rare capsule', EVM_NFT_ADDRESSES.RARE],
                                        ['Epic capsule', EVM_NFT_ADDRESSES.EPIC],
                                    ].map(([label, value]) => (
                                        <div key={label} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</h3>
                                            </div>
                                            {value.startsWith('0x') ? (
                                                <a
                                                    href={explorer(`/address/${value}`)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                                >
                                                    {value}
                                                </a>
                                            ) : (
                                                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">{value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <h3 className="text-lg font-medium text-red-900 dark:text-red-100">Error</h3>
                            </div>
                            <p className="mt-2 text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <ArrowDownLeft className="h-5 w-5 text-green-500" />
                                <h3 className="text-lg font-medium text-green-900 dark:text-green-100">Success</h3>
                            </div>
                            <p className="mt-2 text-green-700 dark:text-green-300">{success}</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </main>
    );
}
