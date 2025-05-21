"use client"

import { Link, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { Home, Grid3X3 } from "lucide-react"
import { WalletButton } from "./wallet-button"

export function Navigation() {
    const location = useLocation()

    const container = {
        hidden: { opacity: 0, y: -20 },
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
        hidden: { opacity: 0, y: -10 },
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

    return (
        <motion.nav
            variants={container}
            initial="hidden"
            animate="show"
            className="flex justify-center"
        >
            <motion.ul
                variants={container}
                className="flex items-center gap-3 md:gap-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 py-3 shadow-md border border-[#b480e4]/30 transition-all duration-300"
            >
                <motion.li variants={item}>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] nav-icon-hover"
                        aria-label="Home"
                    >
                        <Home className="w-6 h-6" />
                    </Link>
                </motion.li>
                <motion.li variants={item}>
                    <Link
                        to="/collection"
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] nav-icon-hover"
                        aria-label="Collection"
                    >
                        <Grid3X3 className="w-6 h-6" />
                    </Link>
                </motion.li>
                <motion.li variants={item}>
                    <WalletButton />
                </motion.li>
            </motion.ul>
        </motion.nav>
    )
}
