"use client"

import { useEffect, useRef, useState } from "react"
import { Settings, Home, Grid3X3, Menu, X } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { WalletButton } from "./wallet-button"

const ICON_BTN =
  "inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] nav-icon-hover"

const MENU_ICON_STROKE = 2.5

const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemMotion = {
  hidden: { opacity: 0, y: 12, scale: 0.85 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export function AdminNav() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 left-4 z-50 flex flex-col-reverse items-center gap-3"
    >
      <button
        type="button"
        className={ICON_BTN}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={MENU_ICON_STROKE} />
        ) : (
          <Menu className="h-6 w-6" strokeWidth={MENU_ICON_STROKE} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            key="admin-menu"
            variants={listMotion}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex flex-col-reverse items-center gap-3"
          >
            <motion.li variants={itemMotion}>
              <Link to="/" className={ICON_BTN} aria-label="Home">
                <Home className="h-6 w-6" />
              </Link>
            </motion.li>
            <motion.li variants={itemMotion}>
              <Link to="/collection" className={ICON_BTN} aria-label="Collection">
                <Grid3X3 className="h-6 w-6" />
              </Link>
            </motion.li>
            <motion.li variants={itemMotion}>
              <WalletButton />
            </motion.li>
            <motion.li variants={itemMotion}>
              <Link to="/admin" className={ICON_BTN} aria-label="Admin">
                <Settings className="h-6 w-6" />
              </Link>
            </motion.li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
