import type { CSSProperties } from "react"
import starA from "../star_a.svg?raw"
import starB from "../star_b.svg?raw"
import starC from "../star_c.svg?raw"
import { FLASH_S, SPARKLE_CYCLE_S, type SparkleVariant } from "../lib/sparkle-timing"

export { FLASH_S, SPARKLE_CYCLE_S, type SparkleVariant }

const STAR_SVG = {
  a: starA,
  b: starB,
  c: starC,
} as const satisfies Record<SparkleVariant, string>

/** Play the packed SMIL once, then stop. */
export function svgPlayOnce(markup: string): string {
  return markup
    .replaceAll('fill="#FFFFFF"', 'fill="currentColor"')
    .replaceAll('repeatCount="indefinite"', 'repeatCount="1"')
}

export const STAR_ONCE_SVG = svgPlayOnce(starA)

export function svgWithPacing(markup: string, delay: number) {
  const scale = FLASH_S / SPARKLE_CYCLE_S
  return markup
    .replaceAll('fill="#FFFFFF"', 'fill="currentColor"')
    .replace(/values="([^"]+)"/g, (_, values: string) => `values="${values};0"`)
    .replace(
      /keyTimes="([^"]+)" dur="1.04s"/g,
      (_, times: string) => {
        const scaled = times
          .split(";")
          .map((t) => (parseFloat(t) * scale).toFixed(6))
          .join(";")
        return `keyTimes="${scaled};1" dur="${SPARKLE_CYCLE_S}s" begin="${delay.toFixed(2)}s"`
      }
    )
}

export function PixelSparkle({
  variant,
  delay = 0,
  size,
  className = "",
  style,
}: {
  variant: SparkleVariant
  delay?: number
  size: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={`pixel-sparkle pointer-events-none absolute z-20 ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svgWithPacing(STAR_SVG[variant], delay) }}
    />
  )
}
