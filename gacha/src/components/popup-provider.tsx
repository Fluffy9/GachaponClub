import { createContext, useContext, useState, useEffect } from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface PopupContextType {
    isOpen: boolean
    content: React.ReactNode | null
    title: string | null
    openPopup: (content: React.ReactNode, title?: string) => void
    closePopup: () => void
}

const PopupContext = createContext<PopupContextType>({
    isOpen: false,
    content: null,
    title: null,
    openPopup: () => { },
    closePopup: () => { },
})

export const usePopup = () => useContext(PopupContext)

export function PopupProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [content, setContent] = useState<React.ReactNode | null>(null)
    const [title, setTitle] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const openPopup = (newContent: React.ReactNode, newTitle?: string) => {
        setContent(newContent)
        setTitle(newTitle || null)
        setIsOpen(true)
        document.body.style.overflow = "hidden"
    }

    const closePopup = () => {
        setIsOpen(false)
        document.body.style.overflow = "auto"
    }

    useEffect(() => {
        const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                closePopup()
            }
        }

        if (isOpen) {
            document.addEventListener("keydown", handleEscapeKey)
        }

        return () => {
            document.removeEventListener("keydown", handleEscapeKey)
        }
    }, [isOpen])

    return (
        <PopupContext.Provider value={{ isOpen, content, title, openPopup, closePopup }}>
            <motion.div
                animate={{
                    scale: isOpen ? 0.95 : 1,
                }}
                transition={{
                    duration: 0.5,
                    ease: "easeInOut"
                }}
                style={{
                    transformOrigin: "center center",
                    willChange: "transform"
                }}
            >
                {children}
            </motion.div>

            {mounted && (
                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Backdrop overlay */}
                            <motion.div
                                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                                transition={{ duration: 0.5 }}
                                className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50"
                                onClick={closePopup}
                                aria-hidden="true"
                            />

                            {/* Popup container */}
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                        delay: 0.2
                                    }}
                                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md mx-auto max-h-[90vh] overflow-auto border-2 border-[#b480e4]/30 dark:border-[#b480e4]/20"
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby={title ? "popup-title" : undefined}
                                >
                                    {/* Header with title and close button */}
                                    <div className="flex items-center justify-between p-4 border-b border-[#b480e4]/10 dark:border-[#b480e4]/5">
                                        {title && (
                                            <h2 id="popup-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1 leading-none m-0">
                                                {title}
                                            </h2>
                                        )}
                                        <button
                                            onClick={closePopup}
                                            className="ml-auto rounded-full p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                            aria-label="Close"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">{content}</div>
                                </motion.div>
                            </div>
                        </>
                    )}
                </AnimatePresence>
            )}
        </PopupContext.Provider>
    )
} 