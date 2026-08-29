import { useEffect, useState } from 'react'
import { FLASH_S, STAR_ONCE_SVG } from './pixel-sparkle'

const PRIMARY_PURPLE = '#b480e4'
const SIZE_PX = 96
const LIFE_MS = Math.round(FLASH_S * 1000)

type Spark = {
  id: number
  x: number
  y: number
}

let nextId = 1

export function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function ClickSparkles() {
  const [sparks, setSparks] = useState<Spark[]>([])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (prefersReducedMotion()) return

      const spark = { id: nextId++, x: event.clientX, y: event.clientY }
      setSparks((current) => [...current.slice(-12), spark])
      window.setTimeout(() => {
        setSparks((current) => current.filter((item) => item.id !== spark.id))
      }, LIFE_MS)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  if (sparks.length === 0) return null

  return (
    <div className="click-sparkle-layer" aria-hidden="true">
      {sparks.map((spark) => (
        <span
          key={spark.id}
          className="click-sparkle"
          style={{
            left: spark.x,
            top: spark.y,
            width: SIZE_PX,
            height: SIZE_PX,
            color: PRIMARY_PURPLE,
            opacity: 1,
          }}
          dangerouslySetInnerHTML={{ __html: STAR_ONCE_SVG }}
        />
      ))}
    </div>
  )
}
