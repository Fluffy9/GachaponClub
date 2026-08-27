import type { ReactNode } from "react"

const BAR_PATTERN = [
  1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1,
  2, 3, 1, 2, 1, 1, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1,
]

const box =
  "overflow-hidden rounded-[3px] border border-neutral-900 bg-white dark:border-neutral-500 dark:bg-gray-800"
const headerBar =
  "border-b border-neutral-900 bg-[#ffe500] px-1 py-0.5 text-center text-[9px] font-bold leading-tight text-neutral-900 dark:border-neutral-600 dark:bg-[#c9b000]"
const ink = "text-neutral-900 dark:text-neutral-100"

function PlMark() {
  return (
    <svg viewBox="0 0 80 70" className="h-[4.25rem] w-[4.75rem] text-neutral-900 dark:text-neutral-100" aria-hidden="true">
      <polygon
        points="40,4 76,66 4,66"
        className="fill-white dark:fill-gray-800"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <text
        x="40"
        y="38"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="currentColor"
      >
        PL
      </text>
      <text
        x="40"
        y="54"
        textAnchor="middle"
        fontSize="5.5"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="currentColor"
      >
        このマークはPL保険付
      </text>
    </svg>
  )
}

function Capsule73() {
  return (
    <svg viewBox="0 0 56 40" className="mx-auto h-9 w-12" aria-hidden="true">
      <ellipse cx="28" cy="20" rx="24" ry="16" fill="#2ea44f" />
      <ellipse cx="28" cy="20" rx="24" ry="16" fill="none" stroke="#176b2e" strokeWidth="1.6" />
      <rect x="26.4" y="6" width="3.2" height="28" fill="#fff" opacity="0.35" />
      <text
        x="28"
        y="25"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#fff"
      >
        73
      </text>
    </svg>
  )
}

function Barcode() {
  return (
    <div aria-hidden="true">
      <div className="flex h-11 items-stretch gap-px bg-white dark:bg-gray-800">
        {BAR_PATTERN.map((w, i) => (
          <span
            key={i}
            className="bg-neutral-900 dark:bg-neutral-100"
            style={{ width: `${w}px`, opacity: i % 11 === 0 ? 0 : 1 }}
          />
        ))}
      </div>
      <p className={`mt-0.5 text-center text-[9px] tracking-[0.14em] ${ink}`}>
        4 580800 203499
      </p>
    </div>
  )
}

function PartnerSticker({
  href,
  src,
  alt,
  className = "",
  imgClassName = "h-10 w-auto max-w-full object-contain",
}: {
  href: string
  src: string
  alt: string
  className?: string
  imgClassName?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center overflow-hidden rounded-[3px] border border-neutral-900 bg-white px-1.5 py-1.5 no-underline dark:border-neutral-500 ${className}`}
    >
      <img src={src} alt={alt} className={imgClassName} />
    </a>
  )
}

function PupcakesSticker({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://github.com/Fluffy9"
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-col justify-center ${box} px-1 py-1 text-center no-underline ${className}`}
    >
      <p className={`text-[7px] font-bold leading-tight tracking-wide ${ink}`}>
        MADE WITH 💖
      </p>
      <p className={`text-[10px] font-extrabold leading-tight tracking-wide ${ink}`}>
        PUPCAKES
      </p>
    </a>
  )
}

function MiniBox({
  title,
  children,
  className = "",
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`${box} ${className}`}>
      {title ? <div className={headerBar}>{title}</div> : null}
      <div className={`px-1.5 py-1 text-[9px] leading-snug ${ink}`}>{children}</div>
    </div>
  )
}

export function LabelStickers() {
  return (
    <aside className="label-stickers hidden w-[13.75rem] shrink-0 lg:block">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col items-center gap-1">
          <div className="w-full rounded-[2px] bg-[#e31c23] px-1 py-1.5 text-center leading-tight text-white dark:bg-[#b7181e]">
            <p className="text-[9px] font-bold">対象年齢</p>
            <p className="text-[13px] font-extrabold tracking-tight">18歳以上</p>
          </div>
          <p className={`text-[8px] font-bold tracking-wide ${ink}`}>MADE IN CHINA</p>
        </div>

        <PartnerSticker
          href="https://atlantachain.io"
          src="/ABC_logo2.png"
          alt="Atlanta Blockchain Center"
        />

        <div className="flex items-center justify-center">
          <PlMark />
        </div>

        <MiniBox title="カプセルサイズ">
          <Capsule73 />
        </MiniBox>

        <MiniBox title="製品材質" className="col-span-2">
          <p>
            <span className="font-bold">本体:</span>ポリエステル
          </p>
          <p>
            <span className="font-bold">ボールチェーン:</span>鉄
          </p>
        </MiniBox>

        <MiniBox className="col-span-2">
          <p className="font-bold">商品番号</p>
          <p className="mb-1 text-[12px] font-extrabold tracking-wide">G-00000</p>
          <Barcode />
        </MiniBox>

        <PartnerSticker
          href="https://raidguild.org"
          src="/RaidGuild.png"
          alt="RaidGuild"
          imgClassName="h-7 w-auto max-w-full object-contain"
        />

        <PupcakesSticker />
      </div>
    </aside>
  )
}

export function MobileLabelCredits() {
  return (
    <div className="label-stickers flex w-full max-w-xs flex-col items-stretch gap-2 lg:hidden">
      <PartnerSticker
        href="https://atlantachain.io"
        src="/ABC_logo2.png"
        alt="Atlanta Blockchain Center"
      />
      <div className="grid grid-cols-2 gap-2">
        <PartnerSticker
          href="https://raidguild.org"
          src="/RaidGuild.png"
          alt="RaidGuild"
          imgClassName="h-7 w-auto max-w-full object-contain"
        />
        <PupcakesSticker />
      </div>
    </div>
  )
}
