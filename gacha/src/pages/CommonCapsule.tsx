import { GachaCapsule } from "../components/gacha-capsule"

export default function CommonCapsule() {
    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="w-[200px] h-[200px] border-2 border-[#9fe8ff] rounded-2xl flex flex-col items-center justify-center gap-4 m-8">
                <p className="text-[#9fe8ff] font-bold">
                    Common Capsule
                </p>
                <div className="w-32 h-32">
                    <GachaCapsule
                        type="common"
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