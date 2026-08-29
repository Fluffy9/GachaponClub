"use client"

import { useMemo, useState, type ReactNode } from "react"
import { motion } from "framer-motion"
import { usePopup } from "./ui/popup-provider"
import { CapsuleArt } from "./capsule-art"
import { CAPSULE_COLORS, type CapsuleType } from "../lib/capsule-art"

interface GachaCapsuleProps {
  type: CapsuleType
  animationDelay: string
  index: number
  row: number
  col: number
  showPopups?: boolean
  showBuyButton?: boolean
  isConnected?: boolean
  onBuy?: () => void
  onConnect?: () => void
  isMinting?: boolean
  error?: string | null
  item?: {
    name: string
    type: CapsuleType
    image: string
    description: string
    probability: number
  }
  renderPopupContent?: (item: unknown) => ReactNode
}

export function GachaCapsule({
  type,
  animationDelay,
  index,
  row,
  col,
  showPopups,
  showBuyButton,
  isConnected,
  onBuy,
  onConnect,
  isMinting,
  error,
  item,
  renderPopupContent
}: GachaCapsuleProps) {
  const [isHovering, setIsHovering] = useState(false)
  const { openPopup } = usePopup()
  const [isSelected, setIsSelected] = useState(false)

  const handleClick = () => {
    if (showPopups && item) {
      openPopup(
        renderPopupContent ? renderPopupContent(item) : (
          <div className="flex flex-col items-center gap-4 p-4">
            <h2 className="text-2xl font-bold text-center text-[#b480e4] dark:text-[#c99df0]">{item.name}</h2>
            <div className="w-32 h-32">
              <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
            </div>
            <p className="text-center text-gray-700 dark:text-gray-300">{item.description}</p>
            {showBuyButton && (
              <>
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
                {isMinting ? (
                  <p className="text-[#b480e4] dark:text-[#c99df0] text-sm mt-2">Minting...</p>
                ) : isConnected ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBuy?.();
                    }}
                    className="mt-4 px-6 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors duration-200 font-medium"
                  >
                    Buy Now
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnect?.();
                    }}
                    className="mt-4 px-6 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors duration-200 font-medium"
                  >
                    Connect Wallet
                  </button>
                )}
              </>
            )}
          </div>
        )
      );
    } else {
      setIsSelected(!isSelected);
      if (isConnected && onBuy) {
        onBuy();
      } else if (onConnect) {
        onConnect();
      }
    }
  };

  const hoverAnimation = {
    scale: 1.1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }

  const center = useMemo(() => {
    const hasValidImage = item?.image && item.image.trim() !== '';
    if (!hasValidImage) return undefined

    return (
      <motion.div
        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-white dark:bg-gray-800"
        style={{
          border: `2px solid ${CAPSULE_COLORS[type]}`,
          boxShadow: `0 0 10px ${CAPSULE_COLORS[type]}40`
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: parseFloat(animationDelay) + 0.2,
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
      >
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-contain"
          style={{
            transform: "scale(1.1)",
            filter: "brightness(1.1) contrast(1.1)"
          }}
          onError={(e) => {
            const container = e.currentTarget.parentElement;
            if (container) {
              container.replaceChildren();
              container.className =
                "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center";
            }
          }}
        />
      </motion.div>
    )
  }, [animationDelay, item, type])

  return (
    <motion.div
      className="relative cursor-pointer"
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="button"
      aria-label={`${type} capsule, costs ${type === "common" ? "$1.00" : type === "rare" ? "$3.00" : "$5.00"}`}
      tabIndex={0}
      animate={isHovering ? hoverAnimation : undefined}
      style={{ willChange: "transform" }}
    >
      <CapsuleArt
        type={type}
        index={index}
        row={row}
        col={col}
        animationDelay={animationDelay}
        center={center}
      />
    </motion.div>
  )
}
