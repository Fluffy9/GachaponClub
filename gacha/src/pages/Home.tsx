"use client"

import { GachaCapsule } from "../components/gacha-capsule"
import { Navigation } from "../components/navigation"
import { ThemeToggle } from "../components/theme-toggle"
import { PriceTag } from "../components/price-tag"
import { FAQ } from "../components/faq"
import { motion } from "framer-motion"
import { useWallet } from "../components/providers/wallet-provider"
import { useState, useEffect, useCallback, useMemo } from "react"
import { usePopup } from "../components/ui/popup-provider"
import { WalletPopup } from "../components/wallet-popup"
import {
    SUI_CONTRACT_ADDRESS,
    ETH_CONTRACT_ADDRESS,
    SUI_MACHINE_ID,
    SUI_MINTER_CAP_ID,
    PRICES,
    ETH_PRICES,
    NFT_METADATA,
    CONTRACT_METHODS,
    SUI_ADMIN_CAP_ID,
    NETWORK
} from "../lib/constants"
import { toast, Toaster } from 'sonner';
import { hasSufficientBalance, formatSui } from "../lib/utils";
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';

type CapsuleType = 'common' | 'rare' | 'epic';
type CapsuleTypeUpper = 'COMMON' | 'RARE' | 'EPIC';

interface Item {
    name: string;
    image: string;
    description: string;
}

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

const fadeInLeft = {
    hidden: { opacity: 0, x: 20 },
    show: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    }
}

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    show: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    }
}

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    }
}

const sampleItems = {
    common: {
        name: "Common",
        type: "common" as const,
        image: "",
        description: "This capsule contains a common NFT.",
        probability: 0.7
    },
    rare: {
        name: "Rare",
        type: "rare" as const,
        image: "",
        description: "This capsule contains a rare NFT.",
        probability: 0.25
    },
    epic: {
        name: "Epic",
        type: "epic" as const,
        image: "",
        description: "This capsule contains a epic NFT.",
        probability: 0.05
    }
}

const Partners = () => {
    return (
        <div className="w-full max-w-6xl px-4 py-12">
            <motion.h2
                variants={item}
                className="text-2xl font-bold text-center mb-8 text-[#b480e4] dark:text-[#c99df0] transition-colors duration-300"
            >
                Our Partners
            </motion.h2>
            <div className="flex justify-center items-center gap-12 flex-wrap">
                <motion.a
                    href="https://atlantachain.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="show"
                    whileHover={{ scale: 1.05 }}
                    className="transition-transform"
                >
                    <img
                        src="/ABC_logo2.png"
                        alt="Atlanta Blockchain Center"
                        className="h-16 object-contain"
                    />
                </motion.a>
                <motion.a
                    href="https://raidguild.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="show"
                    whileHover={{ scale: 1.05 }}
                    className="transition-transform"
                >
                    <img
                        src="/RaidGuild.png"
                        alt="RaidGuild"
                        className="h-16 object-contain"
                    />
                </motion.a>
            </div>
        </div>
    );
};

export default function Home() {
    const { isConnected, address, callContract, connect, walletType } = useWallet();
    const suiClient = useMemo(() => new SuiClient({
        url: 'https://fullnode.testnet.sui.io:443'
    }), []);
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { openPopup } = usePopup();
    const [prices, setPrices] = useState<{
        common?: number;
        rare?: number;
        epic?: number;
    }>({});

    const fetchPrices = useCallback(async () => {
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
                    common: Number(fields.common_price),
                    rare: Number(fields.rare_price),
                    epic: Number(fields.epic_price)
                });
            }
        } catch (err) {
            console.error('Failed to fetch prices:', err);
        }
    }, [suiClient]);

    useEffect(() => {
        if (isConnected) {
            fetchPrices();
        }
    }, [isConnected, fetchPrices]);

    const checkBalance = useCallback(async (type: CapsuleType) => {
        if (!isConnected || !address) return;

        const price = prices[type];
        if (!price) return;

        try {
            const coins = await suiClient.getCoins({
                owner: address,
                coinType: '0x2::sui::SUI'
            });

            const totalBalance = coins.data.reduce((sum: bigint, coin: { balance: string }) => sum + BigInt(coin.balance), 0n);
            const hasBalance = totalBalance >= BigInt(price);


        } catch (error) {
            console.error('Failed to check balance:', error);
        }
    }, [isConnected, address, prices, suiClient]);

    const handleCapsuleClick = useCallback(async (type: CapsuleType) => {
        try {
            if (!isConnected) {
                await connect('sui');
                return;
            }

            setIsMinting(true);
            setError(null);

            const price = prices[type];
            if (!price) {
                throw new Error('Price not available');
            }

            const method = CONTRACT_METHODS.SUI[type.toUpperCase() as CapsuleTypeUpper];
            // IMPORTANT: Argument order must be [machine, payment]
            // - machine: The mutable machine object (SUI_MACHINE_ID)
            // - payment: The payment amount in MIST (BigInt)
            // DO NOT CHANGE THIS ORDER - it matches the Move contract function signature
            await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method,
                args: [SUI_MACHINE_ID, BigInt(price)],
            });

            toast.success('NFT minted successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsMinting(false);
        }
    }, [isConnected, connect, prices, callContract]);

    useEffect(() => {
        if (isConnected) {
            checkBalance('common');
            checkBalance('rare');
            checkBalance('epic');
        }
    }, [isConnected, checkBalance]);

    useEffect(() => {
        return () => {
            setError(null);
            setIsMinting(false);
        };
    }, []);

    const renderPopupContent = useCallback((item: Item | undefined, type: CapsuleType) => {
        return (
            <div className="text-center">
                <h3 className="text-xl font-bold mb-2">{item?.name || 'Unknown Item'}</h3>
                <p className="text-gray-600 mb-4">{item?.description || 'No description available'}</p>
                <button
                    onClick={() => handleCapsuleClick(type)}
                    className="mt-4 px-6 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isMinting ? 'Minting...' : isConnected ? 'Mint NFT' : 'Connect Wallet'}
                </button>
                {error && (
                    <p className="mt-2 text-red-500">{error}</p>
                )}
            </div>
        );
    }, [isConnected, handleCapsuleClick, isMinting, error]);

    return (
        <main className="min-h-screen flex flex-col items-center bg-pattern">
            <div className="w-full max-w-6xl px-4 py-6">
                {/* Add Toaster component */}
                <Toaster position="top-right" richColors />

                {/* Header with Logo and Theme Toggle */}
                <div className="flex flex-col items-center mb-8 relative">
                    <motion.div
                        variants={fadeInLeft}
                        initial="hidden"
                        animate="show"
                        className="absolute right-0 top-0 md:right-4"
                    >
                        <ThemeToggle />
                    </motion.div>
                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        animate="show"
                        className="flex justify-center"
                    >
                        <img
                            src="/logo.png"
                            alt="Gachapon Club Logo - A stylized text logo with pixel art decorations"
                            width={300}
                            height={150}
                            className="drop-shadow-md transition-all duration-300"
                        />
                    </motion.div>
                </div>

                {/* Navigation */}
                <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.2 }}
                >
                    <Navigation />
                </motion.div>

                {/* Main Content - Floating Capsules */}
                <div className="mt-16 mb-20 flex flex-wrap justify-center gap-8 md:gap-16 lg:gap-24">
                    <motion.div
                        variants={fadeInUp}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center"
                    >
                        <div className="relative">
                            <GachaCapsule
                                type="common"
                                animationDelay="0s"
                                index={0}
                                row={0}
                                col={0}
                                totalCols={3}
                                showPopups={true}
                                showBuyButton={true}
                                isConnected={isConnected}
                                onBuy={() => handleCapsuleClick('common')}
                                isMinting={isMinting}
                                error={error}
                                item={sampleItems.common}
                                renderPopupContent={(item) => renderPopupContent(item, 'common')}
                            />
                        </div>
                        <div className="mt-4">
                            {isConnected ? (
                                walletType === 'sui' ? (
                                    prices.common ? (
                                        <PriceTag price={`${prices.common / 1_000_000_000} SUI`} />
                                    ) : (
                                        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]"
                                                style={{
                                                    backgroundSize: '200% 100%',
                                                    imageRendering: 'pixelated'
                                                }}
                                            />
                                        </div>
                                    )
                                ) : (
                                    <PriceTag price={prices.common ? `${prices.common / 1_000_000_000} ETH` : '0 ETH'} />
                                )
                            ) : (
                                <PriceTag price="Connect to view" />
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        variants={fadeInUp}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: 0.4 }}
                        className="flex flex-col items-center"
                    >
                        <div className="relative">
                            <GachaCapsule
                                type="rare"
                                animationDelay="0.2s"
                                index={1}
                                row={0}
                                col={1}
                                totalCols={3}
                                showPopups={true}
                                showBuyButton={true}
                                isConnected={isConnected}
                                onBuy={() => handleCapsuleClick('rare')}
                                isMinting={isMinting}
                                error={error}
                                item={sampleItems.rare}
                                renderPopupContent={(item) => renderPopupContent(item, 'rare')}
                            />
                        </div>
                        <div className="mt-4">
                            {isConnected ? (
                                walletType === 'sui' ? (
                                    prices.rare ? (
                                        <PriceTag price={`${prices.rare / 1_000_000_000} SUI`} />
                                    ) : (
                                        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]"
                                                style={{
                                                    backgroundSize: '200% 100%',
                                                    imageRendering: 'pixelated'
                                                }}
                                            />
                                        </div>
                                    )
                                ) : (
                                    <PriceTag price={prices.rare ? `${prices.rare / 1_000_000_000} ETH` : '0 ETH'} />
                                )
                            ) : (
                                <PriceTag price="Connect to view" />
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        variants={fadeInUp}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: 0.5 }}
                        className="flex flex-col items-center"
                    >
                        <div className="relative">
                            <GachaCapsule
                                type="epic"
                                animationDelay="0.4s"
                                index={2}
                                row={0}
                                col={2}
                                totalCols={3}
                                showPopups={true}
                                showBuyButton={true}
                                isConnected={isConnected}
                                onBuy={() => handleCapsuleClick('epic')}
                                isMinting={isMinting}
                                error={error}
                                item={sampleItems.epic}
                                renderPopupContent={(item) => renderPopupContent(item, 'epic')}
                            />
                        </div>
                        <div className="mt-4">
                            {isConnected ? (
                                walletType === 'sui' ? (
                                    prices.epic ? (
                                        <PriceTag price={`${prices.epic / 1_000_000_000} SUI`} />
                                    ) : (
                                        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]"
                                                style={{
                                                    backgroundSize: '200% 100%',
                                                    imageRendering: 'pixelated'
                                                }}
                                            />
                                        </div>
                                    )
                                ) : (
                                    <PriceTag price={prices.epic ? `${prices.epic / 1_000_000_000} ETH` : '0 ETH'} />
                                )
                            ) : (
                                <PriceTag price="Connect to view" />
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Partners Section */}
            <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.6 }}
            >
                <Partners />
            </motion.div>

            {/* FAQ Section */}
            <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.7 }}
                className="w-full max-w-6xl px-4 py-12"
            >
                <motion.h2
                    variants={item}
                    className="text-2xl font-bold text-center mb-6 text-[#b480e4] dark:text-[#c99df0] transition-colors duration-300"
                >
                    Frequently Asked Questions
                </motion.h2>
                <FAQ />
            </motion.div>

            {/* Footer */}
            <motion.footer
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.8 }}
                className="text-center text-sm text-gray-600 dark:text-gray-400 mt-auto mb-12 transition-colors duration-300"
            >
                <p className="pixel-text">Made with 💖 by <a href="https://github.com/Fluffy9" className="text-[#b480e4] dark:text-[#c99df0] pixel-text">Pupcakes</a></p>
            </motion.footer>
        </main>
    );
}