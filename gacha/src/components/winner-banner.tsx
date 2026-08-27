import { useId } from "react"

export function WinnerBanner() {
  const rawId = useId().replace(/:/g, "")
  const pathId = `winner-arc-${rawId}`

  return (
    <svg
      viewBox="0 0 800 290"
      overflow="visible"
      className="winner-banner pointer-events-none w-[min(96vw,42rem)] h-auto"
      role="img"
      aria-label="Every roll is a winner"
    >
      <path
        id={pathId}
        d="M 48 278 A 352 198 0 0 1 752 278"
        fill="none"
      />
      <text fill="currentColor">
        <textPath
          href={`#${pathId}`}
          startOffset="50%"
          textAnchor="middle"
        >
          Every Roll is a Winner
        </textPath>
      </text>
    </svg>
  )
}
