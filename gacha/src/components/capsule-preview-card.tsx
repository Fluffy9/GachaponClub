import { CapsuleArt } from './capsule-art'
import {
  CAPSULE_TYPE_LABEL,
  CAPSULE_TYPE_THEME,
  type CapsuleType,
} from '../lib/capsule-art'

const COLUMN_INDEX: Record<CapsuleType, number> = {
  common: 0,
  rare: 1,
  epic: 2,
}

export function CapsulePreviewCard({
  type,
  className = '',
}: {
  type: CapsuleType
  className?: string
}) {
  const index = COLUMN_INDEX[type]

  return (
    <div
      data-capsule-gif-root
      className={`price-sticker ${CAPSULE_TYPE_THEME[type]} w-[9.5rem] overflow-hidden rounded-[1.15rem] ${className}`}
    >
      <div className="price-sticker-header flex items-baseline justify-center gap-1 px-2 py-1">
        <span className="text-[11px] font-bold tracking-wide">
          {CAPSULE_TYPE_LABEL[type]}
        </span>
        <span className="text-[15px] font-black leading-none">1</span>
        <span className="text-[11px] font-bold tracking-wide">TYPE</span>
      </div>
      <div className="price-sticker-body relative flex min-h-[8.5rem] items-center justify-center px-2 pb-3 pt-2">
        <CapsuleArt
          type={type}
          index={index}
          row={0}
          col={index}
          animationDelay="0s"
        />
      </div>
    </div>
  )
}
