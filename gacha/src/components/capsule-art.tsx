import { useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { PixelSparkle } from './pixel-sparkle'
import {
  bounceDelay,
  CAPSULE_COLORS,
  CAPSULE_SIZE_CLASS,
  capsuleSparkles,
  type CapsuleType,
} from '../lib/capsule-art'

export function CapsuleArt({
  type,
  index = 0,
  row = 0,
  col = 0,
  sizeClass = CAPSULE_SIZE_CLASS,
  animationDelay = '0s',
  animate = true,
  animateBounce = true,
  center,
}: {
  type: CapsuleType
  index?: number
  row?: number
  col?: number
  sizeClass?: string
  animationDelay?: string
  animate?: boolean
  animateBounce?: boolean
  center?: ReactNode
}) {
  const sparkles = useMemo(() => capsuleSparkles(type, index), [type, index])
  const delay = bounceDelay(type, row, col)

  const bounceAnimation =
    animate && animateBounce
      ? {
          y: [0, -10, 0],
          transition: {
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse' as const,
            ease: 'easeInOut',
            delay,
          },
        }
      : undefined

  const questionMark = (
    <motion.span
      className="capsule-question"
      animate={
        animate
          ? {
              opacity: [1, 0.3, 1],
              scale: [1, 0.9, 1],
            }
          : undefined
      }
      transition={
        animate
          ? {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : undefined
      }
    >
      ?
    </motion.span>
  )

  return (
    <motion.div
      className={`relative ${sizeClass}`}
      animate={bounceAnimation}
      data-capsule-art
    >
      {sparkles.map((sparkle, i) => (
        <PixelSparkle
          key={i}
          variant={sparkle.variant}
          delay={sparkle.delay}
          size={sparkle.size}
          className={
            type === 'epic'
              ? 'text-[#b480e4] dark:text-gray-200'
              : 'text-[#fab5e2] dark:text-gray-200'
          }
          style={{
            top: sparkle.top,
            left: sparkle.left,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      <motion.div
        className="absolute inset-0 flex items-center justify-center rounded-full"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: parseFloat(animationDelay),
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
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="white"
            stroke="#b480e4"
            strokeWidth="5"
            className="dark:fill-gray-800 dark:stroke-[#9d6ad0]"
          />
          <path
            d="M10,60 a50,50 0 0,0 100,0"
            fill={CAPSULE_COLORS[type]}
            opacity="0.25"
            className="dark:opacity-30"
          />
          <path
            d="M10,60 a50,25 0 0,1 100,0"
            fill="white"
            opacity="0.5"
            stroke="#b480e4"
            strokeWidth="5"
            className="dark:fill-gray-700 dark:stroke-[#9d6ad0]"
          />
          <path
            d="M10,60 a50,25 0 0,0 100,0"
            fill="white"
            stroke="#b480e4"
            strokeWidth="5"
            className="dark:fill-gray-800 dark:stroke-[#9d6ad0]"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="rgba(255, 255, 255, 0.15)"
            stroke={CAPSULE_COLORS[type]}
            strokeWidth="0"
            className="dark:fill-[rgba(0,0,0,0.1)]"
          />
        </motion.svg>

        <div className="absolute inset-0 flex items-center justify-center">
          {center ?? (
            <div className="capsule-question-wrap">
              {questionMark}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
