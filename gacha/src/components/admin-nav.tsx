"use client"

import { Settings, Home } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { motion } from "framer-motion"

export function AdminNav() {
    const location = useLocation();
    const isAdminPage = location.pathname === '/admin';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed bottom-4 left-4 z-50"
        >
            <Link
                to={isAdminPage ? "/" : "/admin"}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] nav-icon-hover"
                aria-label={isAdminPage ? "Go Home" : "Admin Settings"}
            >
                {isAdminPage ? (
                    <Home className="w-6 h-6" />
                ) : (
                    <Settings className="w-6 h-6" />
                )}
            </Link>
        </motion.div>
    )
} 