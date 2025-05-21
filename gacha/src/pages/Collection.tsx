import { useWallet } from '../components/providers/wallet-provider';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from "framer-motion"
import { GachaCapsule } from "../components/gacha-capsule"
import { Navigation } from "../components/navigation"
import { ThemeToggle } from "../components/theme-toggle"
import { getImageUrl } from '../lib/constants';

const fadeInLeft: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.5 } }
}

const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
}

const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

type PrizeType = "epic" | "rare" | "common"

interface Prize {
    name: string;
    type: PrizeType;
    imageUrl: string;
    description: string;
    probability: number;
}

interface GachaCapsuleItem {
    name: string;
    type: PrizeType;
    image: string;
    description: string;
    probability: number;
}

// Animation variants
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        transition: {
            staggerChildren: 0.05,
            staggerDirection: -1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

function Pagination({ totalItems, currentPage, onPageChange }: { totalItems: number, currentPage: number, onPageChange: (page: number) => void }) {
    const [itemsPerPage, setItemsPerPage] = useState(9);
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    useEffect(() => {
        const updateItemsPerPage = () => {
            const width = window.innerWidth;
            if (width >= 1280) setItemsPerPage(20); // xl
            else if (width >= 1024) setItemsPerPage(16); // lg
            else if (width >= 768) setItemsPerPage(12); // md
            else if (width >= 640) setItemsPerPage(8); // sm
            else setItemsPerPage(4); // mobile
        };

        updateItemsPerPage();
        window.addEventListener('resize', updateItemsPerPage);
        return () => window.removeEventListener('resize', updateItemsPerPage);
    }, []);

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex items-center justify-center mt-8">
            <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-3 shadow-md border border-[#b480e4]/30 dark:border-[#b480e4]/20 transition-all duration-300">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                >
                    ←
                </button>

                {startPage > 1 && (
                    <>
                        <button
                            onClick={() => onPageChange(1)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0]"
                        >
                            <span>1</span>
                        </button>
                        {startPage > 2 && <span className="text-[#b480e4] dark:text-[#c99df0]">...</span>}
                    </>
                )}

                {pages.map((page) => (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${currentPage === page
                            ? "bg-[#b480e4] text-white"
                            : "bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 text-[#b480e4] dark:text-[#c99df0]"
                            }`}
                    >
                        <span>{page}</span>
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="text-[#b480e4] dark:text-[#c99df0]">...</span>}
                        <button
                            onClick={() => onPageChange(totalPages)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0]"
                        >
                            <span>{totalPages}</span>
                        </button>
                    </>
                )}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next page"
                >
                    →
                </button>
            </div>
        </div>
    )
}

export default function Collection() {
    const { prizePool, fetchPrizePool, address } = useWallet();
    const [currentPage, setCurrentPage] = useState(1);
    const [gridCols, setGridCols] = useState(3);
    const [showPopups, setShowPopups] = useState(true);
    const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
    // Debug logging for component state
    useEffect(() => {
        console.log('Collection component state:', {
            address,
            prizePoolLength: prizePool?.length,
            currentPage,
            gridCols
        });
    }, [address, prizePool, currentPage, gridCols]);

    // Fetch prize pool data
    useEffect(() => {
        const fetchData = async () => {
            if (!address) {
                console.log('No address available, skipping fetch');
                return;
            }
            console.log('Starting prize pool fetch...');
            try {
                await fetchPrizePool();
                console.log('Prize pool fetch completed');
            } catch (error) {
                console.error('Error fetching prize pool:', error);
            }
        };

        fetchData();
    }, [address]);

    // Calculate visible prizes for current page
    const itemsPerPage = 9;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPrizes = prizePool.slice(startIndex, endIndex);

    console.log('Prize pool state:', {
        totalPrizes: prizePool.length,
        startIndex,
        endIndex,
        currentPrizesCount: currentPrizes.length
    });

    // Update grid columns based on window width
    useEffect(() => {
        const updateGridCols = () => {
            const width = window.innerWidth;
            console.log('Window width changed:', width);
            if (width < 640) {
                setGridCols(1);
            } else if (width < 1024) {
                setGridCols(2);
            } else if (width < 1280) {
                setGridCols(3);
            } else {
                setGridCols(4);
            }
        };

        updateGridCols();
        window.addEventListener('resize', updateGridCols);
        return () => window.removeEventListener('resize', updateGridCols);
    }, []);

    const renderPopupContent = () => {
        if (!selectedPrize) return null;
        return (
            <div className="flex flex-col p-4">
                {/* Title - Full width */}
                <h2 className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mb-4 text-center">{selectedPrize.name}</h2>

                {/* Content - Image and Details */}
                <div className="flex gap-6">
                    {/* Left side - Image */}
                    <div className="w-32 h-32 flex-shrink-0">
                        <img src={getImageUrl(selectedPrize.imageUrl)} alt={selectedPrize.name} className="w-full h-full object-contain" />
                    </div>

                    {/* Right side - Details */}
                    <div className="flex-1 flex flex-col">
                        {/* Probability Bar */}
                        <div className="mb-3">
                            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-1">
                                <div
                                    className="absolute h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${(selectedPrize.probability * 100)}%`,
                                        backgroundColor: selectedPrize.type === 'epic' ? '#FFD700' :
                                            selectedPrize.type === 'rare' ? '#C0C0C0' :
                                                '#CD7F32'
                                    }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>{((selectedPrize.probability * 100).toFixed(4))}% chance</span>
                                <span className="group relative">
                                    {selectedPrize.type === 'epic' ? 'Epic' :
                                        selectedPrize.type === 'rare' ? 'Rare' :
                                            'Common'}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {selectedPrize.type === 'epic' ? 'Epic Tier' :
                                            selectedPrize.type === 'rare' ? 'Rare Tier' :
                                                'Common Tier'}
                                    </div>
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{selectedPrize.description}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen flex flex-col items-center bg-pattern">
            <div className="w-full max-w-6xl px-4 py-6">
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

                {/* Main Content - Capsule Collection */}
                <div className="mt-16 mb-20">
                    {prizePool.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center justify-center py-16 px-4 text-center"
                        >
                            <div className="mb-6">
                                <GachaCapsule
                                    type="common"
                                    animationDelay="0s"
                                    index={0}
                                    row={0}
                                    col={0}
                                    totalCols={1}
                                    showPopups={false}
                                />
                            </div>
                            <h2 className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mb-2">
                                No Prizes Found
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 max-w-md">
                                The machine is currently empty
                            </p>
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`page-${currentPage}`}
                                variants={container}
                                initial="hidden"
                                animate="show"
                                exit="exit"
                                layout
                                className={`grid gap-4 ${gridCols === 1 ? 'grid-cols-1' :
                                    gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                                        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                                    }`}
                            >
                                {currentPrizes.map((prize: Prize, index: number) => {
                                    const row = Math.floor(index / gridCols)
                                    const col = index % gridCols
                                    const capsuleItem: GachaCapsuleItem = {
                                        name: prize.name,
                                        type: prize.type,
                                        image: getImageUrl(prize.imageUrl),
                                        description: prize.description,
                                        probability: prize.probability
                                    }
                                    return (
                                        <motion.div
                                            key={`${currentPage}-${index}`}
                                            variants={item}
                                            layout
                                            className="flex justify-center"
                                            style={{
                                                transformOrigin: "center center",
                                                willChange: "transform, opacity, filter"
                                            }}
                                            onMouseEnter={() => setSelectedPrize(prize)}
                                            onMouseLeave={() => setSelectedPrize(null)}
                                        >
                                            <GachaCapsule
                                                type={prize.type}
                                                animationDelay={`${index * 0.1}s`}
                                                index={index}
                                                row={row}
                                                col={col}
                                                totalCols={gridCols}
                                                showPopups={showPopups}
                                                item={capsuleItem}
                                                renderPopupContent={renderPopupContent}
                                            />
                                        </motion.div>
                                    )
                                })}
                            </motion.div>
                        </AnimatePresence>
                    )}

                    <Pagination
                        totalItems={prizePool.length}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                </div>

                {/* Footer */}
                <footer className="text-center text-sm text-gray-600 dark:text-gray-400 mt-auto transition-colors duration-300 opacity-0 animate-fade-in-up delay-700">
                    <p className="pixel-text">Made with 💖 by <a href="https://github.com/Fluffy9" className="text-[#b480e4] dark:text-[#c99df0] pixel-text">Pupcakes</a></p>
                </footer>
            </div>
        </main>
    )
}