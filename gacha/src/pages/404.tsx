import { motion } from "framer-motion"
import { ThemeToggle } from "../components/theme-toggle"
import { Navigation } from "../components/navigation"
import { GachaCapsule } from "../components/gacha-capsule"
import { Link } from "react-router-dom"

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
}

export default function NotFound() {
    return (
        <main className="min-h-screen flex flex-col items-center bg-pattern">
            <div className="w-full max-w-6xl px-4 py-6">
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
                    <motion.div
                        variants={item}
                        initial="hidden"
                        animate="show"
                        className="flex justify-center"
                    >
                        <img
                            src="/logo.png"
                            alt="Gachapon Club Logo"
                            width={300}
                            height={150}
                            className="drop-shadow-md transition-all duration-300"
                        />
                    </motion.div>
                </div>

                {/* Navigation */}
                <motion.div
                    variants={item}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.2 }}
                >
                    <Navigation />
                </motion.div>

                {/* 404 Content */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
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
                    <h1 className="text-4xl font-bold text-[#b480e4] dark:text-[#c99df0] mb-4">
                        404 - Page Not Found
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                        Oops! The page you're looking for seems to have disappeared into the gacha machine.
                    </p>
                    <Link
                        to="/"
                        className="px-6 py-3 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors"
                    >
                        Return Home
                    </Link>
                </motion.div>

                {/* Footer */}
                <footer className="text-center text-sm text-gray-600 dark:text-gray-400 mt-auto transition-colors duration-300 opacity-0 animate-fade-in-up delay-700">
                    <p className="pixel-text">Made with 💖 by <a href="https://github.com/Fluffy9" className="text-[#b480e4] dark:text-[#c99df0] pixel-text">Pupcakes</a></p>
                </footer>
            </div>
        </main>
    )
} 