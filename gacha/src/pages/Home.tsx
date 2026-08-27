"use client"

import { GachaCapsule } from "../components/gacha-capsule"
import { Navigation } from "../components/navigation"
import { ThemeToggle } from "../components/theme-toggle"
import { PriceTag } from "../components/price-tag"
import { WinnerBanner } from "../components/winner-banner"
import { FAQ } from "../components/faq"
import { LabelStickers, MobileLabelCredits } from "../components/label-stickers"
import { motion } from "framer-motion"
import { useWallet } from "../components/providers/wallet-provider"
import { useState, useEffect, useCallback, useMemo } from "react"
import { usePopup } from "../components/ui/popup-provider"
import { WalletPopup } from "../components/wallet-popup"
import {
    SUI_CONTRACT_ADDRESS,
    EVM_MACHINE_ADDRESS,
    SUI_MACHINE_ID,
    SUI_MINTER_CAP_ID,
    PRICES,
    ETH_PRICES,
    NFT_METADATA,
    CONTRACT_METHODS,
    SUI_ADMIN_CAP_ID,
    NETWORK,
    EVM_RARITY_ID
} from "../lib/constants"
import { toast, Toaster } from 'sonner';
import { hasSufficientBalance, formatSui } from "../lib/utils";
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { formatEthAmount } from "../lib/evm";

type CapsuleType = 'common' | 'rare' | 'epic';
type CapsuleTypeUpper = 'COMMON' | 'RARE' | 'EPIC';

interface Item {
    name: string;
    image: string;
    description: string;
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

export default function Home() {
    const { isConnected, address, callContract, walletType, evmRarities } = useWallet();
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
                openPopup(<WalletPopup />, "Your Wallet");
                return;
            }

            setIsMinting(true);
            setError(null);

            if (walletType === 'eth') {
                const rarityId = EVM_RARITY_ID[type];
                const rarity = evmRarities.find((item) => item.id === rarityId);
                if (!rarity) {
                    throw new Error('Price not available');
                }
                await callContract({
                    chain: 'eth',
                    contractAddress: EVM_MACHINE_ADDRESS,
                    method: 'purchase',
                    args: [BigInt(rarityId)],
                    options: { value: rarity.price },
                });
                toast.success('Capsule purchased');
                return;
            }

            const price = prices[type];
            if (!price) {
                throw new Error('Price not available');
            }

            const method = CONTRACT_METHODS.SUI[type.toUpperCase() as CapsuleTypeUpper];
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
    }, [isConnected, walletType, prices, callContract, evmRarities, openPopup]);

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

    const priceShimmer = (
        <div className="h-[4.25rem] w-[9.5rem] rounded-[1.15rem] bg-gray-200 dark:bg-gray-700 relative overflow-hidden ring-[3px] ring-white dark:ring-gray-600">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]"
                style={{
                    backgroundSize: '200% 100%',
                }}
            />
        </div>
    );

    const renderPrice = (type: CapsuleType) => {
        if (walletType === 'sui') {
            const price = prices[type];
            if (!price) return priceShimmer;
            return (
                <PriceTag
                    type={type}
                    amount={String(price / 1_000_000_000)}
                    unit="SUI"
                />
            );
        }
        const rarity = evmRarities.find((item) => item.id === EVM_RARITY_ID[type]);
        if (!rarity) return priceShimmer;
        return (
            <PriceTag
                type={type}
                amount={formatEthAmount(rarity.price)}
                unit="ETH"
            />
        );
    };

    return (
        <main className="relative min-h-screen flex flex-col items-center bg-pattern">
            <motion.div
                variants={fadeInLeft}
                initial="hidden"
                animate="show"
                className="absolute right-4 top-4 z-20 md:right-6"
            >
                <ThemeToggle />
            </motion.div>
            <div className="w-full max-w-6xl px-4 pb-12 pt-8">
                <Toaster position="top-right" richColors />

                <div className="relative mb-8 flex flex-col items-center">
                    <motion.div
                        variants={fadeInUp}
                        initial="hidden"
                        animate="show"
                        className="-mb-6 md:-mb-10"
                    >
                        <WinnerBanner />
                    </motion.div>
                    <motion.div
                        variants={scaleIn}
                        initial="hidden"
                        animate="show"
                        className="flex justify-center"
                    >
                        <img
                            src="/logo.svg"
                            alt="Gachapon Club"
                            width={480}
                            height={200}
                            className="w-[min(92vw,28rem)] h-auto drop-shadow-md"
                        />
                    </motion.div>
                </div>

                <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.2 }}
                >
                    <Navigation />
                </motion.div>

                <div className="mt-16 mb-12 flex flex-wrap justify-center gap-8 md:gap-16 lg:gap-24">
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
                                {renderPrice('common')}
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
                                {renderPrice('rare')}
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
                                {renderPrice('epic')}
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        variants={fadeInUp}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: 0.7 }}
                        className="py-8"
                    >
                        <div className="flex items-start gap-4">
                            <div className="min-w-0 flex-1">
                                <FAQ />
                            </div>
                            <LabelStickers />
                        </div>
                    </motion.div>

                    <motion.footer
                        variants={fadeInUp}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: 0.8 }}
                        className="flex w-full justify-center pb-4"
                    >
                        <MobileLabelCredits />
                    </motion.footer>
            </div>
        </main>
    );
}