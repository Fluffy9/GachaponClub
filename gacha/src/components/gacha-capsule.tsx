"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { usePopup } from "./ui/popup-provider"
import { PixelSparkle, SPARKLE_CYCLE_S, type SparkleVariant } from "./pixel-sparkle"

interface GachaCapsuleProps {
  type: "common" | "rare" | "epic"
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
    type: "common" | "rare" | "epic"
    image: string
    description: string
    probability: number
  }
  renderPopupContent?: (item: any) => React.ReactNode
}

const SPARKLE_VARIANTS: SparkleVariant[] = ["a", "c", "b"]

function unit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
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

  const capsuleColors = {
    common: "#9fe8ff",
    rare: "#fab5e2",
    epic: "#ffd93b",
  }

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

  // Calculate a deterministic delay based on type and position
  const typeDelay = {
    common: 0,
    rare: 0.5,
    epic: 1
  }[type]

  // Stagger the bounce animation based on position in grid
  const bounceDelay = (typeDelay + (row * 0.2) + (col * 0.1)) % 2

  const bounceAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut",
      delay: bounceDelay
    }
  }

  const hoverAnimation = {
    scale: 1.1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }

  const sparkles = useMemo(() => {
    if (type === "common") return []
    const count = type === "epic" ? 5 : 2
    return Array.from({ length: count }, (_, i) => {
      const seed = index * 17 + i * 31 + (type === "epic" ? 7 : 3)
      return {
        variant: SPARKLE_VARIANTS[i % SPARKLE_VARIANTS.length],
        top: `${8 + unit(seed) * 84}%`,
        left: `${8 + unit(seed + 1) * 84}%`,
        size: `${(18 + unit(seed + 2) * 14) * 3}%`,
        delay: (i * SPARKLE_CYCLE_S) / count + unit(seed + 3) * 0.8,
      }
    })
  }, [type, index])

  return (
    <motion.div
      className="relative cursor-pointer"
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="button"
      aria-label={`${type} capsule, costs ${type === "common" ? "$1.00" : type === "rare" ? "$3.00" : "$5.00"}`}
      tabIndex={0}
      animate={isHovering ? hoverAnimation : bounceAnimation}
      style={{
        willChange: "transform"
      }}
    >
      {sparkles.map((sparkle, i) => (
        <PixelSparkle
          key={i}
          variant={sparkle.variant}
          delay={sparkle.delay}
          size={sparkle.size}
          className={
            type === "epic"
              ? "text-[#b480e4] dark:text-gray-200"
              : "text-[#fab5e2] dark:text-gray-200"
          }
          style={{
            top: sparkle.top,
            left: sparkle.left,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      <motion.div
        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          delay: parseFloat(animationDelay)
        }}
      >
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="white"
            stroke="#b480e4"
            strokeWidth="5"
            className="dark:fill-gray-800 dark:stroke-[#9d6ad0]"
          />

          {/* Bottom fill with capsule type color */}
          <path
            d="M10,60 a50,50 0 0,0 100,0"
            fill={capsuleColors[type]}
            opacity="0.25"
            className={`dark:opacity-30`}
          />

          {/* Top half ellipse */}
          <path
            d="M10,60 a50,25 0 0,1 100,0"
            fill="white"
            opacity="0.5"
            stroke="#b480e4"
            strokeWidth="5"
            className="dark:fill-gray-700 dark:stroke-[#9d6ad0]"
          />

          {/* Bottom half ellipse */}
          <path
            d="M10,60 a50,25 0 0,0 100,0"
            fill="white"
            stroke="#b480e4"
            strokeWidth="5"
            className="dark:fill-gray-800 dark:stroke-[#9d6ad0]"
          />

          {/* Inner fill */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="rgba(255, 255, 255, 0.15)"
            stroke={capsuleColors[type]}
            strokeWidth="0"
            className="dark:fill-[rgba(0,0,0,0.1)]"
          />
        </motion.svg>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: parseFloat(animationDelay) + 0.2,
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        >
          {(() => {
            const hasValidImage = item?.image && item.image.trim() !== '';

            if (hasValidImage) {
              return (
                <motion.div
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-white dark:bg-gray-800"
                  style={{
                    border: `2px solid ${capsuleColors[type]}`,
                    boxShadow: `0 0 10px ${capsuleColors[type]}40`
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
                        container.style.border = 'none';
                        container.style.boxShadow = 'none';
                        container.innerHTML = `
                          <motion.span
                            class="font-['Press_Start_2P'] text-xl sm:text-2xl md:text-3xl text-gray-600 dark:text-gray-400 flex items-center justify-center w-full h-full"
                            animate={{
                              opacity: [1, 0.3, 1],
                              scale: [1, 0.9, 1]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            ?
                          </motion.span>
                        `;
                      }
                    }}
                  />
                </motion.div>
              );
            }

            return (
              <motion.div
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center"
              >
                <motion.span
                  className="font-['Press_Start_2P'] text-xl sm:text-2xl md:text-3xl text-gray-600 dark:text-gray-400"
                  animate={{
                    opacity: [1, 0.3, 1],
                    scale: [1, 0.9, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  ?
                </motion.span>
              </motion.div>
            );
          })()}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
