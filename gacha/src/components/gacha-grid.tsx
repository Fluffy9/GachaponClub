"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GachaCapsule } from "./gacha-capsule"

interface GachaGridProps {
    items: Array<{
        name: string
        type: "common" | "rare" | "epic"
        image: string
        description: string
        probability: number
    }>
    showPopups?: boolean
    currentPage: number
    renderPopupContent?: (item: any) => React.ReactNode
}

export function GachaGrid({ items, showPopups = false, currentPage, renderPopupContent }: GachaGridProps) {
    const [itemsPerPage, setItemsPerPage] = useState(12)
    const [mounted, setMounted] = useState(false)
    const [gridCols, setGridCols] = useState(4)

    // Handle client-side initialization
    useEffect(() => {
        setMounted(true)
    }, [])

    // Update items per page based on screen size
    useEffect(() => {
        if (!mounted) return

        const updateItemsPerPage = () => {
            const width = window.innerWidth
            const newItemsPerPage = width >= 1280 ? 50 :
                width >= 1024 ? 40 :
                    width >= 768 ? 30 :
                        width >= 640 ? 20 : 10
            setItemsPerPage(newItemsPerPage)
        }

        updateItemsPerPage()
        window.addEventListener('resize', updateItemsPerPage)
        return () => window.removeEventListener('resize', updateItemsPerPage)
    }, [mounted])

    // Update grid columns based on screen size
    useEffect(() => {
        if (!mounted) return

        const updateGridCols = () => {
            const width = window.innerWidth
            const newCols = width < 640 ? 1 : width < 1024 ? 2 : 4
            setGridCols(newCols)
        }

        updateGridCols()
        window.addEventListener('resize', updateGridCols)
        return () => window.removeEventListener('resize', updateGridCols)
    }, [mounted])

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, items.length)
    const currentItems = items.slice(startIndex, endIndex)

    // Don't render anything until mounted to prevent hydration mismatch
    if (!mounted) {
        return null
    }

    const container = {
        hidden: {
            opacity: 0,
            scale: 0.95
        },
        show: {
            opacity: 1,
            scale: 1,
            transition: {
                when: "beforeChildren",
                staggerChildren: 0.1,
                delayChildren: 0.2,
                duration: 0.5
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: {
                when: "afterChildren",
                staggerChildren: 0.05,
                staggerDirection: -1,
                duration: 0.3
            }
        }
    }

    const itemAnimation = {
        hidden: {
            opacity: 0,
            scale: 0.3,
            y: 100,
            rotate: -15,
            filter: "blur(10px)"
        },
        show: {
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: 0,
            filter: "blur(0px)",
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 20,
                mass: 1,
                duration: 0.8
            }
        },
        exit: {
            opacity: 0,
            scale: 0.3,
            y: -100,
            rotate: 15,
            filter: "blur(10px)",
            transition: {
                duration: 0.3,
                ease: "easeInOut"
            }
        }
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`page-${currentPage}`}
                variants={container}
                initial="hidden"
                animate="show"
                exit="exit"
                layout
                className={`grid gap-4 sm:gap-6 lg:gap-8 ${gridCols === 1 ? 'grid-cols-1' :
                    gridCols === 2 ? 'grid-cols-2' :
                        gridCols === 3 ? 'grid-cols-3' :
                            'grid-cols-4'
                    }`}
            >
                {currentItems.map((capsule, index) => {
                    const row = Math.floor(index / gridCols)
                    const col = index % gridCols
                    return (
                        <motion.div
                            key={`${currentPage}-${index}`}
                            variants={itemAnimation}
                            layout
                            className="flex justify-center"
                            style={{
                                transformOrigin: "center center",
                                willChange: "transform, opacity, filter"
                            }}
                        >
                            <GachaCapsule
                                type={capsule.type}
                                animationDelay={`${index * 0.1}s`}
                                index={index}
                                row={row}
                                col={col}
                                totalCols={gridCols}
                                showPopups={showPopups}
                                item={capsule}
                                renderPopupContent={renderPopupContent}
                            />
                        </motion.div>
                    )
                })}
            </motion.div>
        </AnimatePresence>
    )
} 