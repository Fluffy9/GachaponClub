import { SPARKLE_CYCLE_S, type SparkleVariant } from './sparkle-timing'

export type CapsuleType = 'common' | 'rare' | 'epic'

export const CAPSULE_COLORS: Record<CapsuleType, string> = {
  common: '#9fe8ff',
  rare: '#fab5e2',
  epic: '#ffd93b',
}

export const CAPSULE_TYPE_LABEL: Record<CapsuleType, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
}

export const CAPSULE_TYPE_THEME: Record<CapsuleType, string> = {
  common: 'price-sticker--common',
  rare: 'price-sticker--rare',
  epic: 'price-sticker--epic',
}

/** One full pixel-sparkle SMIL loop — GIF capture length for every tier. */
export const CAPSULE_GIF_LOOP_MS = Math.round(SPARKLE_CYCLE_S * 1000)
export const CAPSULE_GIF_FPS = 20
export const CAPSULE_GIF_FRAME_MS = 1000 / CAPSULE_GIF_FPS

export const CAPSULE_TYPES: CapsuleType[] = ['common', 'rare', 'epic']

/** Same responsive sizing as homepage GachaCapsule. */
export const CAPSULE_SIZE_CLASS = 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32'

/** Fixed GIF frame — card fills this canvas edge-to-edge (logical px). */
export const CAPSULE_GIF_FRAME = { width: 152, height: 180 }

export const CAPSULE_GIF_VIEWPORT = CAPSULE_GIF_FRAME

/** All GIF motion synced to one sparkle cycle for seamless loops. */
export const CAPSULE_LOOP_S = SPARKLE_CYCLE_S

/** Desktop capsule size used inside GIF cards. */
export const CAPSULE_GIF_SIZE_CLASS = 'w-32 h-32'

const SPARKLE_VARIANTS: SparkleVariant[] = ['a', 'c', 'b']

export function unit(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export type CapsuleSparkle = {
  variant: SparkleVariant
  top: string
  left: string
  size: string
  delay: number
}

export function capsuleSparkles(
  type: CapsuleType,
  index: number,
  forGif = false,
): CapsuleSparkle[] {
  if (type === 'common') return []
  const count = type === 'epic' ? 5 : 2
  return Array.from({ length: count }, (_, i) => {
    const seed = index * 17 + i * 31 + (type === 'epic' ? 7 : 3)
    const stagger = (i * SPARKLE_CYCLE_S) / count
    return {
      variant: SPARKLE_VARIANTS[i % SPARKLE_VARIANTS.length]!,
      top: `${8 + unit(seed) * 84}%`,
      left: `${8 + unit(seed + 1) * 84}%`,
      size: `${(18 + unit(seed + 2) * 14) * 3}%`,
      delay: forGif ? stagger : stagger + unit(seed + 3) * 0.8,
    }
  })
}

export function bounceDelay(type: CapsuleType, row = 0, col = 0) {
  const typeDelay = { common: 0, rare: 0.5, epic: 1 }[type]
  return (typeDelay + row * 0.2 + col * 0.1) % 2
}
