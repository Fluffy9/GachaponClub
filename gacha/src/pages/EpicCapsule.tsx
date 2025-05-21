import { GachaCapsule } from "../components/gacha-capsule"

export default function EpicCapsule() {
    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="w-[200px] h-[200px] border-2 border-[#ffd93b] rounded-2xl flex flex-col items-center justify-center gap-4 m-8">
                <p className="text-[#ffd93b] font-bold">
                    Epic Capsule
                </p>
                <div className="w-32 h-32">
                    <GachaCapsule
                        type="epic"
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