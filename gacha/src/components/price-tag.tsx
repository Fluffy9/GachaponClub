type CapsuleType = "common" | "rare" | "epic"

const TYPE_LABEL: Record<CapsuleType, string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
}

const TYPE_THEME: Record<CapsuleType, string> = {
  common: "price-sticker--common",
  rare: "price-sticker--rare",
  epic: "price-sticker--epic",
}

interface PriceTagProps {
  type: CapsuleType
  amount: string
  unit: string
}

export function PriceTag({ type, amount, unit }: PriceTagProps) {
  return (
    <div
      className={`price-sticker ${TYPE_THEME[type]} w-[9.5rem] overflow-hidden rounded-[1.15rem]`}
    >
      <div className="price-sticker-header flex items-baseline justify-center gap-1 px-2 py-1">
        <span className="text-[11px] font-bold tracking-wide">{TYPE_LABEL[type]}</span>
        <span className="text-[15px] font-black leading-none">1</span>
        <span className="text-[11px] font-bold tracking-wide">TYPE</span>
      </div>
      <div className="price-sticker-body relative flex items-end justify-center gap-1 px-2 pb-1.5 pt-1">
        <span className="mb-0.5 text-[11px] font-bold">each</span>
        <span className="text-[1.65rem] font-black leading-none tracking-tight">{amount}</span>
        <span className="relative mb-0.5 text-[13px] font-black leading-none">
          {unit}
        </span>
      </div>
    </div>
  )
}
