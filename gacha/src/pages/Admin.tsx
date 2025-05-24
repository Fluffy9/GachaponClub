"use client"

import { useWallet } from "../components/providers/wallet-provider"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ThemeToggle } from "../components/theme-toggle"
import { WalletConnectionPrompt } from "../components/wallet-connection-prompt"
import {
    SUI_CONTRACT_ADDRESS,
    SUI_MACHINE_ID,
    SUI_ADMIN_CAP_ID,
    EXPLORER_URL,
    NFT_MODULES,
    getImageUrl
} from "../lib/constants"
import { AlertCircle, Wallet, Coins, Package, Settings, ArrowUpRight, ArrowDownLeft, Upload } from "lucide-react"
import { toast, Toaster } from 'sonner'
import { formatSUI } from "@suiet/wallet-kit"
import { Transaction } from "@mysten/sui/transactions"

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

export default function Admin() {
    const { walletType, isConnected, callContract, suiClient, freeMintNFT, address, suiWallet, approvedNFTs, fetchApprovedNFTs } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [machineStats, setMachineStats] = useState({
        totalPlays: 0,
        commonRewards: 0,
        rareRewards: 0,
        epicRewards: 0,
        treasuryBalance: BigInt(0)
    });
    const [newNFTType, setNewNFTType] = useState("");
    const [newNFTTier, setNewNFTTier] = useState("common");
    const [activeTab, setActiveTab] = useState<'nfts' | 'withdraw' | 'settings' | 'free'>('nfts');
    const [prices, setPrices] = useState({
        common: 2,
        rare: 6,
        epic: 12
    });
    const [adminAddress, setAdminAddress] = useState<string | null>(null);
    const [freeNFTs, setFreeNFTs] = useState<Array<{
        name: string;
        imageUrl: string;
        type: 'bear' | 'cat' | 'unicorn';
    }>>([
        {
            name: "Bear NFT",
            imageUrl: getImageUrl("https://gachapon.club/bear.png"),
            type: 'bear'
        },
        {
            name: "Cat NFT",
            imageUrl: getImageUrl("https://gachapon.club/cat.png"),
            type: 'cat'
        },
        {
            name: "Unicorn NFT",
            imageUrl: getImageUrl("https://gachapon.club/unicorn.png"),
            type: 'unicorn'
        }
    ]);

    useEffect(() => {
        document.title = "Admin Dashboard | Gachapon Club"
    }, []);

    const fetchPrices = async () => {
        try {
            const machine = await suiClient.getObject({
                id: SUI_MACHINE_ID,
                options: { showContent: true }
            });

            if (machine.data?.content?.dataType === 'moveObject') {
                const fields = machine.data.content.fields as {
                    common_price: string;
                    rare_price: string;
                    epic_price: string;
                };
                setPrices({
                    common: Number(fields.common_price) / 1_000_000_000,
                    rare: Number(fields.rare_price) / 1_000_000_000,
                    epic: Number(fields.epic_price) / 1_000_000_000
                });
            }
        } catch (err) {
            console.error('Failed to fetch prices:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch prices');
        }
    };

    const fetchMachineStats = async () => {
        try {
            const machine = await suiClient.getObject({
                id: SUI_MACHINE_ID,
                options: { showContent: true }
            });

            if (machine.data?.content?.dataType === 'moveObject') {
                const fields = machine.data.content.fields as {
                    total_plays: string;
                    common_rewards: string;
                    rare_rewards: string;
                    epic_rewards: string;
                    treasury: { fields: { balance: string } };
                };
                setMachineStats({
                    totalPlays: fields.total_plays ? Number(fields.total_plays) : 0,
                    commonRewards: fields.common_rewards ? Number(fields.common_rewards) : 0,
                    rareRewards: fields.rare_rewards ? Number(fields.rare_rewards) : 0,
                    epicRewards: fields.epic_rewards ? Number(fields.epic_rewards) : 0,
                    treasuryBalance: fields.treasury.fields.balance ? BigInt(fields.treasury.fields.balance) : BigInt(0)
                });
            }
        } catch (err) {
            console.error('Failed to fetch machine stats:', err);
            toast.error('Failed to fetch machine stats');
        }
    };

    const fetchAdminAddress = async () => {
        try {
            const adminCap = await suiClient.getObject({
                id: SUI_ADMIN_CAP_ID,
                options: {
                    showContent: true,
                    showOwner: true
                }
            });

            console.log('Admin Cap Object:', JSON.stringify(adminCap, null, 2));

            if (adminCap.data?.content?.dataType === 'moveObject') {
                const fields = adminCap.data.content.fields as {
                    id: { id: string }
                };
                // Get the object's owner from the object data
                const owner = adminCap.data.owner;
                console.log('Owner:', owner);

                if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
                    setAdminAddress(owner.AddressOwner);
                } else {
                    console.error('Admin cap owner structure:', owner);
                    toast.error('Failed to fetch admin address: Invalid owner type');
                }
            } else {
                console.error('Admin cap data structure:', adminCap.data);
                toast.error('Failed to fetch admin address: Invalid object type');
            }
        } catch (err) {
            console.error('Failed to fetch admin address:', err);
            toast.error('Failed to fetch admin address');
        }
    };

    useEffect(() => {
        if (isConnected) {
            const fetchData = async () => {
                await Promise.all([
                    fetchPrices(),
                    fetchMachineStats(),
                    fetchAdminAddress(),
                    fetchApprovedNFTs()
                ]);
            };
            fetchData();
        }
    }, [isConnected]);

    useEffect(() => {
        console.log('=== Admin Page approvedNFTs ===');
        console.log('approvedNFTs:', approvedNFTs);
    }, [approvedNFTs]);

    const handleNFTApproval = async (nftType: string, tier: string, isApproved: boolean) => {
        try {
            console.log('Starting NFT approval process...');
            console.log('Current wallet address:', address);
            console.log('Admin address:', adminAddress);
            console.log('NFT Type:', nftType);
            console.log('NFT Tier:', tier);
            console.log('Is Approved:', isApproved);

            setIsLoading(true);
            setError(null);
            setSuccess(null);

            if (!address) {
                console.error('Wallet not connected');
                throw new Error('Wallet not connected');
            }

            if (address !== adminAddress) {
                console.error('Non-admin attempt to approve NFT:', {
                    currentAddress: address,
                    adminAddress: adminAddress
                });
                throw new Error('Only the admin can approve NFTs');
            }

            if (!nftType || !tier) {
                console.error('Missing required fields:', {
                    nftType: nftType,
                    nftTier: tier
                });
                throw new Error('NFT type and tier must be provided');
            }

            const tierBytes = new TextEncoder().encode(tier);
            console.log('Tier bytes:', Array.from(tierBytes));

            let fullType = nftType;
            console.log('Full NFT type path:', fullType);

            const tx = new Transaction();
            tx.setSender(address);
            console.log('Transaction created with sender:', address);
            console.log('Creating move call with arguments:', {
                adminCapId: SUI_ADMIN_CAP_ID,
                tierBytes: Array.from(tierBytes),
                machineId: SUI_MACHINE_ID
            });

            tx.moveCall({
                target: `${SUI_CONTRACT_ADDRESS}::machine::approve_nft`,
                typeArguments: [fullType],
                arguments: [
                    tx.object(SUI_ADMIN_CAP_ID),
                    tx.pure.vector("u8", Array.from(tierBytes)),
                    tx.pure.bool(isApproved),
                    tx.object(SUI_MACHINE_ID),
                ],
            });

            console.log('Building transaction...');
            const builtTx = await tx.build({ client: suiClient });
            console.log('Transaction built successfully');

            console.log('Executing transaction...');
            await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: 'machine::approve_nft',
                args: [],
                options: {
                    transaction: tx
                }
            });
            console.log('Transaction executed successfully');

            toast.success(`NFT type ${isApproved ? 'approved' : 'unapproved'} successfully`);
            if (isApproved) {
                setNewNFTType("");
            }

            // Refresh both machine stats and approved NFTs list
            console.log('Refreshing data...');
            await Promise.all([
                fetchMachineStats(),
                fetchApprovedNFTs()
            ]);
            console.log('Data refreshed successfully');
        } catch (err) {
            console.error(`Failed to ${isApproved ? 'approve' : 'unapprove'} NFT:`, err);
            const errorMessage = err instanceof Error ? err.message : `Failed to ${isApproved ? 'approve' : 'unapprove'} NFT`;
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
            console.log('NFT approval process completed');
        }
    };

    const handleWithdraw = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: 'machine::withdraw_treasury',
                args: [
                    SUI_ADMIN_CAP_ID,
                    SUI_MACHINE_ID
                ],
            });

            toast.success('Treasury withdrawn successfully');
            await Promise.all([
                fetchMachineStats(),
                fetchApprovedNFTs()
            ]);
        } catch (err) {
            console.error('Failed to withdraw treasury:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw treasury';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePrices = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            const commonMist = Math.round(prices.common * 1_000_000_000);
            const rareMist = Math.round(prices.rare * 1_000_000_000);
            const epicMist = Math.round(prices.epic * 1_000_000_000);

            await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method: 'machine::update_prices',
                args: [
                    SUI_ADMIN_CAP_ID,
                    SUI_MACHINE_ID,
                    BigInt(commonMist),
                    BigInt(rareMist),
                    BigInt(epicMist)
                ],
            });

            toast.success('Prices updated successfully');
            await Promise.all([
                fetchPrices(),
                fetchApprovedNFTs()
            ]);
        } catch (err) {
            console.error('Failed to update prices:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update prices';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMintFreeNFT = async (nft: { name: string; imageUrl: string; type: 'bear' | 'cat' | 'unicorn' }) => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            await freeMintNFT(nft.type);
            toast.success(`${nft.name} minted successfully`);
        } catch (err) {
            console.error('Failed to mint free NFT:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to mint free NFT';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Update the treasury balance display
    const treasuryBalanceDisplay = Number(machineStats.treasuryBalance) / 1_000_000_000;

    const renderApprovedNFTs = () => {
        console.log('=== Rendering Approved NFTs ===');
        console.log('Current approvedNFTs:', approvedNFTs);

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Common Tier</h3>
                    <div className="space-y-4">
                        {approvedNFTs.filter(nft => nft.tier === 'common').length > 0 ? (
                            approvedNFTs.filter(nft => nft.tier === 'common').map((nft, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    {nft.imageUrl && (
                                        <img
                                            src={nft.imageUrl}
                                            alt={nft.name}
                                            className="w-12 h-12 object-contain rounded-lg"
                                        />
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {nft.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {nft.type.split('::').pop()}
                                        </div>
                                        {nft.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {nft.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">none</div>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Rare Tier</h3>
                    <div className="space-y-4">
                        {approvedNFTs.filter(nft => nft.tier === 'rare').length > 0 ? (
                            approvedNFTs.filter(nft => nft.tier === 'rare').map((nft, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    {nft.imageUrl && (
                                        <img
                                            src={nft.imageUrl}
                                            alt={nft.name}
                                            className="w-12 h-12 object-contain rounded-lg"
                                        />
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {nft.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {nft.type.split('::').pop()}
                                        </div>
                                        {nft.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {nft.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">none</div>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Epic Tier</h3>
                    <div className="space-y-4">
                        {approvedNFTs.filter(nft => nft.tier === 'epic').length > 0 ? (
                            approvedNFTs.filter(nft => nft.tier === 'epic').map((nft, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    {nft.imageUrl && (
                                        <img
                                            src={nft.imageUrl}
                                            alt={nft.name}
                                            className="w-12 h-12 object-contain rounded-lg"
                                        />
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {nft.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {nft.type.split('::').pop()}
                                        </div>
                                        {nft.description && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {nft.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">none</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen flex flex-col items-center bg-pattern">
            <div className="w-full max-w-6xl px-4 py-6">
                {/* Add Toaster component */}
                <Toaster position="top-right" richColors />

                {/* Header with Theme Toggle */}
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
                </div>

                {/* Main Content */}
                {!address ? (
                    <WalletConnectionPrompt message="Connect your wallet to access the admin dashboard" />
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="space-y-6"
                    >
                        {/* Machine Stats */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Machine Statistics</h2>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {machineStats.totalPlays} Plays
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Coins className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {machineStats.commonRewards + machineStats.rareRewards + machineStats.epicRewards} Total Rewards
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {treasuryBalanceDisplay.toFixed(5)} SUI
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Total Plays
                                    </h3>
                                    <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">
                                        {machineStats.totalPlays}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Common Rewards
                                    </h3>
                                    <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">
                                        {machineStats.commonRewards}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Rare Rewards
                                    </h3>
                                    <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">
                                        {machineStats.rareRewards}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Epic Rewards
                                    </h3>
                                    <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mt-2">
                                        {machineStats.epicRewards}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Approved NFTs Overview */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Approved NFTs Overview</h2>
                            {renderApprovedNFTs()}
                        </div>

                        {/* Tabs */}
                        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setActiveTab('nfts')}
                                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'nfts'
                                    ? 'text-[#b480e4] dark:text-[#c99df0] border-b-2 border-[#b480e4] dark:border-[#c99df0]'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Approved NFTs
                            </button>
                            <button
                                onClick={() => setActiveTab('free')}
                                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'free'
                                    ? 'text-[#b480e4] dark:text-[#c99df0] border-b-2 border-[#b480e4] dark:border-[#c99df0]'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Free NFTs
                            </button>
                            <button
                                onClick={() => setActiveTab('withdraw')}
                                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'withdraw'
                                    ? 'text-[#b480e4] dark:text-[#c99df0] border-b-2 border-[#b480e4] dark:border-[#c99df0]'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Withdraw
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'settings'
                                    ? 'text-[#b480e4] dark:text-[#c99df0] border-b-2 border-[#b480e4] dark:border-[#c99df0]'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Settings
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="mt-4">
                            {activeTab === 'nfts' && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Approved NFTs (Admin Only)</h2>

                                    {/* Instructions */}
                                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">How to Approve NFTs</h3>
                                        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                                            <li>Enter the full NFT type in the format: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">package_id::module_name::struct_name</code></li>
                                            <li>For example, to approve the Bear NFT, use: <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded break-all">{SUI_CONTRACT_ADDRESS}::bear::Bear</code></li>
                                            <li>Select the appropriate tier (common, rare, or epic)</li>
                                            <li>Click "Approve NFT Type" to add it to the approved list</li>
                                        </ol>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Add new NFT type */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label htmlFor="nftType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    NFT Type
                                                </label>
                                                <input
                                                    id="nftType"
                                                    type="text"
                                                    value={newNFTType}
                                                    onChange={(e) => setNewNFTType(e.target.value)}
                                                    placeholder="Enter NFT type (e.g., package_id::module_name::struct_name)"
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
                                                    onChange={(e) => setNewNFTTier(e.target.value)}
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
                                                    disabled={isLoading || !newNFTType}
                                                    className="w-full px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isLoading ? 'Approving...' : 'Approve NFT Type'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* List of approved NFTs */}
                                        <div className="space-y-2">
                                            {approvedNFTs.map((nft, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {nft.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Module: {nft.module}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Tier: {nft.tier}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                                                            Type: {nft.type}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleNFTApproval(nft.type, nft.tier, false)}
                                                        disabled={isLoading}
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

                            {activeTab === 'free' && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Free NFTs</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                        {freeNFTs.map((nft, index) => (
                                            <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                                                <div className="aspect-square relative">
                                                    <img
                                                        src={getImageUrl(nft.imageUrl)}
                                                        alt={nft.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                                        {nft.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => handleMintFreeNFT(nft)}
                                                        disabled={isLoading}
                                                        className="w-full px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isLoading ? 'Minting...' : 'Mint Free NFT'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'withdraw' && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Withdraw Treasury (Admin Only)</h2>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Available Balance
                                                </p>
                                                <p className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0]">
                                                    {treasuryBalanceDisplay.toFixed(5)} SUI
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleWithdraw}
                                                disabled={isLoading || machineStats.treasuryBalance === BigInt(0)}
                                                className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowUpRight className="w-4 h-4" />
                                                {isLoading ? 'Withdrawing...' : 'Withdraw All'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6">
                                    {/* Price Settings */}
                                    <div className="mb-6">
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Machine Settings (Admin Only)</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Common NFT Price (SUI)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={prices.common}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        if (!isNaN(value) && value >= 0) {
                                                            setPrices(prev => ({ ...prev, common: value }));
                                                        }
                                                    }}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Rare NFT Price (SUI)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={prices.rare}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        if (!isNaN(value) && value >= 0) {
                                                            setPrices(prev => ({ ...prev, rare: value }));
                                                        }
                                                    }}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Epic NFT Price (SUI)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={prices.epic}
                                                    onChange={(e) => {
                                                        const value = parseFloat(e.target.value);
                                                        if (!isNaN(value) && value >= 0) {
                                                            setPrices(prev => ({ ...prev, epic: value }));
                                                        }
                                                    }}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <button
                                                onClick={handleUpdatePrices}
                                                disabled={isLoading}
                                                className="px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isLoading ? 'Updating...' : 'Update Prices'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Contract Info */}
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Contract Info</h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Admin Address
                                                </h3>
                                            </div>
                                            {adminAddress ? (
                                                <a
                                                    href={`${EXPLORER_URL}/address/${adminAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                                >
                                                    {adminAddress}
                                                </a>
                                            ) : (
                                                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    Loading admin address...
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Contract Address
                                                </h3>
                                            </div>
                                            <a
                                                href={`${EXPLORER_URL}/object/${SUI_CONTRACT_ADDRESS}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                            >
                                                {SUI_CONTRACT_ADDRESS}
                                            </a>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Bear Module
                                                </h3>
                                            </div>
                                            <a
                                                href={`${EXPLORER_URL}/object/${NFT_MODULES.BEAR}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                            >
                                                {NFT_MODULES.BEAR}
                                            </a>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Cat Module
                                                </h3>
                                            </div>
                                            <a
                                                href={`${EXPLORER_URL}/object/${NFT_MODULES.CAT}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                            >
                                                {NFT_MODULES.CAT}
                                            </a>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Unicorn Module
                                                </h3>
                                            </div>
                                            <a
                                                href={`${EXPLORER_URL}/object/${NFT_MODULES.UNICORN}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                            >
                                                {NFT_MODULES.UNICORN}
                                            </a>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Admin Cap ID
                                                </h3>
                                            </div>
                                            <a
                                                href={`${EXPLORER_URL}/object/${SUI_ADMIN_CAP_ID}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                            >
                                                {SUI_ADMIN_CAP_ID}
                                            </a>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Settings className="w-5 h-5 text-[#b480e4] dark:text-[#c99df0]" />
                                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    Machine ID
                                                </h3>
                                            </div>
                                            <a
                                                href={`${EXPLORER_URL}/object/${SUI_MACHINE_ID}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#b480e4] dark:text-[#c99df0] hover:underline mt-1 break-all block"
                                            >
                                                {SUI_MACHINE_ID}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error and Success Messages */}
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
                )}
            </div>
        </main>
    );
} 