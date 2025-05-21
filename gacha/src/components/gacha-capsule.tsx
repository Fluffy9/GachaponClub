"use client"

import { useState, useMemo } from "react"
import { usePopup } from "./ui/popup-provider"
import { motion, AnimatePresence } from "framer-motion"

interface GachaCapsuleProps {
  type: "common" | "rare" | "epic"
  animationDelay: string
  index: number
  row: number
  col: number
  totalCols: number
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

interface PatternElement {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Pattern {
  viewBox: string;
  path?: string;
  elements?: PatternElement[];
  isPath: boolean;
}

export function GachaCapsule({
  type,
  animationDelay,
  index,
  row,
  col,
  totalCols,
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

  const darkModeColors = {
    common: "#5fb8cc",
    rare: "#d87eb6",
    epic: "#e0b441",
  }

  const handleClick = () => {
    console.log('[GachaCapsule] handleClick called', {
      showPopups,
      hasItem: !!item,
      isConnected,
      hasOnBuy: !!onBuy,
      hasOnConnect: !!onConnect,
      type
    });

    if (showPopups && item) {
      console.log('[GachaCapsule] Opening popup with item:', item);
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
                      console.log('[GachaCapsule] Buy button clicked', {
                        isConnected,
                        hasOnBuy: !!onBuy,
                        type
                      });
                      e.stopPropagation();
                      if (onBuy) {
                        console.log('[GachaCapsule] Calling onBuy');
                        onBuy();
                      } else {
                        console.log('[GachaCapsule] onBuy is not defined');
                      }
                    }}
                    className="mt-4 px-6 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg transition-colors duration-200 font-medium"
                  >
                    Buy Now
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      console.log('[GachaCapsule] Connect button clicked', {
                        hasOnConnect: !!onConnect
                      });
                      e.stopPropagation();
                      if (onConnect) {
                        console.log('[GachaCapsule] Calling onConnect');
                        onConnect();
                      } else {
                        console.log('[GachaCapsule] onConnect is not defined');
                      }
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
      console.log('[GachaCapsule] Direct capsule click', {
        isConnected,
        hasOnBuy: !!onBuy,
        hasOnConnect: !!onConnect,
        type
      });
      setIsSelected(!isSelected);
      if (isConnected && onBuy) {
        console.log('[GachaCapsule] Direct click - calling onBuy');
        onBuy();
      } else if (onConnect) {
        console.log('[GachaCapsule] Direct click - calling onConnect');
        onConnect();
      } else {
        console.log('[GachaCapsule] No action available for direct click');
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

  const getRandomShines = (type: string) => {
    const count = type === "epic" ? 5 : 2;
    const shines = [];

    // Collection of different SVG patterns
    const patterns: Pattern[] = [
      // Original curved pattern
      {
        viewBox: "0 0 24 24",
        path: "M12 3 Q13 9 19 12 Q13 15 12 21 Q11 15 5 12 Q11 9 12 3 Z",
        isPath: true
      },
      // Small plus pattern
      {
        viewBox: "0 0 5 5",
        elements: [
          { type: 'rect', x: 2, y: 0, width: 1, height: 1 },
          { type: 'rect', x: 2, y: 2, width: 1, height: 1 },
          { type: 'rect', x: 2, y: 4, width: 1, height: 1 },
          { type: 'rect', x: 0, y: 2, width: 1, height: 1 },
          { type: 'rect', x: 4, y: 2, width: 1, height: 1 }
        ],
        isPath: false
      },
      // Large plus pattern with corners
      {
        viewBox: "0 0 7 7",
        elements: [
          { type: 'rect', x: 3, y: 0, width: 1, height: 1 },
          { type: 'rect', x: 3, y: 3, width: 1, height: 1 },
          { type: 'rect', x: 3, y: 6, width: 1, height: 1 },
          { type: 'rect', x: 0, y: 3, width: 1, height: 1 },
          { type: 'rect', x: 6, y: 3, width: 1, height: 1 },
          { type: 'rect', x: 2, y: 2, width: 1, height: 1 },
          { type: 'rect', x: 4, y: 2, width: 1, height: 1 },
          { type: 'rect', x: 2, y: 4, width: 1, height: 1 },
          { type: 'rect', x: 4, y: 4, width: 1, height: 1 }
        ],
        isPath: false
      }
    ];

    for (let i = 0; i < count; i++) {
      // Random position between 5% and 95%
      const top = 5 + Math.random() * 90;
      const left = 5 + Math.random() * 90;

      // Random size between 15% and 25%
      const size = 15 + Math.random() * 10;

      // Random opacity between 0.5 and 0.9 for light mode, 0.3 and 0.7 for dark mode
      const opacity = {
        light: 0.5 + Math.random() * 0.4,
        dark: 0.3 + Math.random() * 0.4
      };

      // Random animation delay
      const delay = Math.random() * 2;

      // Random pattern
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      shines.push({
        position: {
          top: `${top}%`,
          left: `${left}%`,
          transform: 'translate(-50%, -50%)'
        },
        size: `${size}%`,
        opacity,
        delay,
        pattern
      });
    }

    return shines;
  };

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
      {/* Shine effects */}
      {type !== "common" && (
        <>
          {getRandomShines(type).map((shine, i) => (
            <motion.svg
              key={i}
              width="24"
              height="24"
              viewBox={shine.pattern.viewBox}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute"
              style={{
                width: shine.size,
                height: shine.size,
                ...shine.position,
                zIndex: 20
              }}
            >
              {shine.pattern.isPath ? (
                <motion.path
                  d={shine.pattern.path}
                  fill="none"
                  stroke={type === "epic" ? "#b480e4" : type === "rare" ? "#fab5e2" : "#9fe8ff"}
                  strokeWidth="1.5"
                  opacity={shine.opacity.light}
                  className="dark:stroke-gray-300 dark:opacity-[var(--dark-opacity)]"
                  style={{
                    '--dark-opacity': shine.opacity.dark
                  } as React.CSSProperties}
                  animate={{
                    y: [0, -5, 0],
                    scale: [1, 1.1, 1],
                    opacity: [
                      shine.opacity.light,
                      shine.opacity.light + 0.2,
                      shine.opacity.light
                    ],
                    transition: {
                      duration: 2 + Math.random(),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: shine.delay
                    }
                  }}
                />
              ) : (
                <motion.g
                  fill={type === "epic" ? "#b480e4" : type === "rare" ? "#fab5e2" : "#9fe8ff"}
                  opacity={shine.opacity.light}
                  className="dark:fill-gray-300 dark:opacity-[var(--dark-opacity)]"
                  style={{
                    '--dark-opacity': shine.opacity.dark
                  } as React.CSSProperties}
                  animate={{
                    y: [0, -5, 0],
                    scale: [1, 1.1, 1],
                    opacity: [
                      shine.opacity.light,
                      shine.opacity.light + 0.2,
                      shine.opacity.light
                    ],
                    transition: {
                      duration: 2 + Math.random(),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: shine.delay
                    }
                  }}
                >
                  {shine.pattern.elements?.map((element, j) => (
                    <rect
                      key={j}
                      x={element.x}
                      y={element.y}
                      width={element.width}
                      height={element.height}
                    />
                  ))}
                </motion.g>
              )}
            </motion.svg>
          ))}
        </>
      )}

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
