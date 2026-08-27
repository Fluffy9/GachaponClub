import { motion } from 'framer-motion'
import { GachaCapsule } from './gacha-capsule'
import { PriceTag } from './price-tag'
import { formatEthAmount } from '../lib/evm'
import { EVM_RARITY_ID } from '../lib/constants'
import type { CapsuleType } from '../hooks/use-capsule-shop'
import type { EvmRarity } from '../lib/evm'

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: 'easeOut',
        },
    },
}

const sampleItems = {
    common: {
        name: 'Common',
        type: 'common' as const,
        image: '',
        description: 'This capsule contains a common NFT.',
        probability: 0.7,
    },
    rare: {
        name: 'Rare',
        type: 'rare' as const,
        image: '',
        description: 'This capsule contains a rare NFT.',
        probability: 0.25,
    },
    epic: {
        name: 'Epic',
        type: 'epic' as const,
        image: '',
        description: 'This capsule contains a epic NFT.',
        probability: 0.05,
    },
}

const COLUMNS: Array<{ type: CapsuleType; delay: number; animationDelay: string; index: number }> = [
    { type: 'common', delay: 0.3, animationDelay: '0s', index: 0 },
    { type: 'rare', delay: 0.4, animationDelay: '0.2s', index: 1 },
    { type: 'epic', delay: 0.5, animationDelay: '0.4s', index: 2 },
]

function PriceShimmer() {
    return (
        <div className="h-[4.25rem] w-[9.5rem] rounded-[1.15rem] bg-gray-200 dark:bg-gray-700 relative overflow-hidden ring-[3px] ring-white dark:ring-gray-600">
            <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]"
                style={{ backgroundSize: '200% 100%' }}
            />
        </div>
    )
}

export function CapsuleShopRow({
    isConnected,
    walletType,
    evmRarities,
    prices,
    isMinting,
    error,
    onBuy,
}: {
    isConnected: boolean
    walletType: 'sui' | 'eth' | null
    evmRarities: EvmRarity[]
    prices: { common?: number; rare?: number; epic?: number }
    isMinting: boolean
    error: string | null
    onBuy: (type: CapsuleType) => void
}) {
    const renderPrice = (type: CapsuleType) => {
        if (walletType === 'sui') {
            const price = prices[type]
            if (!price) return <PriceShimmer />
            return <PriceTag type={type} amount={String(price / 1_000_000_000)} unit="SUI" />
        }
        const rarity = evmRarities.find((item) => item.id === EVM_RARITY_ID[type])
        if (!rarity) return <PriceShimmer />
        return <PriceTag type={type} amount={formatEthAmount(rarity.price)} unit="ETH" />
    }

    return (
        <div className="mt-16 mb-12 flex flex-wrap justify-center gap-8 md:gap-16 lg:gap-24">
            {COLUMNS.map((column) => (
                <motion.div
                    key={column.type}
                    variants={fadeInUp}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: column.delay }}
                    className="flex flex-col items-center"
                >
                    <div className="relative">
                        <GachaCapsule
                            type={column.type}
                            animationDelay={column.animationDelay}
                            index={column.index}
                            row={0}
                            col={column.index}
                            showPopups={true}
                            showBuyButton={true}
                            isConnected={isConnected}
                            onBuy={() => onBuy(column.type)}
                            isMinting={isMinting}
                            error={error}
                            item={sampleItems[column.type]}
                            renderPopupContent={(item) => (
                                <div className="text-center">
                                    <h3 className="text-xl font-bold mb-2">{item?.name || 'Unknown Item'}</h3>
                                    <p className="text-gray-600 mb-4">{item?.description || 'No description available'}</p>
                                    <button
                                        onClick={() => onBuy(column.type)}
                                        className="mt-4 px-6 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isMinting ? 'Minting...' : isConnected ? 'Mint NFT' : 'Connect Wallet'}
                                    </button>
                                    {error && <p className="mt-2 text-red-500">{error}</p>}
                                </div>
                            )}
                        />
                    </div>
                    <div className="mt-4">{renderPrice(column.type)}</div>
                </motion.div>
            ))}
        </div>
    )
}
