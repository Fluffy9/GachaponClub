"use client"

import { ThemeToggle } from "../components/theme-toggle"
import { FAQ } from "../components/faq"
import { LabelStickers, MobileLabelCredits } from "../components/label-stickers"
import { CapsuleShopRow } from "../components/capsule-column"
import { motion } from "framer-motion"
import { useCapsuleShop } from "../hooks/use-capsule-shop"

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

export default function Home() {
    const shop = useCapsuleShop()

    return (
        <main className="relative min-h-screen flex flex-col items-center bg-pattern">
            <div className="w-full max-w-6xl px-4 py-6 pb-12">
                <div className="relative mb-8 flex flex-col items-center pt-10 md:pt-14">
                    <motion.div
                        variants={fadeInLeft}
                        initial="hidden"
                        animate="show"
                        className="absolute right-0 top-0 z-20 md:right-4"
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
                            src="/logo.svg"
                            alt="Gachapon Club"
                            width={480}
                            height={200}
                            className="w-[min(92vw,28rem)] h-auto drop-shadow-md"
                        />
                    </motion.div>
                </div>

                <CapsuleShopRow
                    isConnected={shop.isConnected}
                    walletType={shop.walletType}
                    evmRarities={shop.evmRarities}
                    prices={shop.prices}
                    isMinting={shop.isMinting}
                    error={shop.error}
                    onBuy={shop.buyCapsule}
                />

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
    )
}
