import { GachaCapsule } from "../components/gacha-capsule"

export default function RareCapsule() {
    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="w-[200px] h-[200px] border-2 border-[#fab5e2] rounded-2xl flex flex-col items-center justify-center gap-4 m-8">
                <p className="text-[#fab5e2] font-bold">
                    Rare Capsule
                </p>
                <div className="w-32 h-32">
                    <GachaCapsule
                        type="rare"
                        animationDelay="0s"
                        index={0}
                        row={0}
                        col={0}
                        totalCols={1}
                        showPopups={false}
                    />
                </div>
            </div>
        </main>
    )
} 