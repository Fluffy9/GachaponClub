import { GachaCapsule } from "./gacha-capsule"

interface WalletConnectionPromptProps {
    message: string;
}

export function WalletConnectionPrompt({ message }: WalletConnectionPromptProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-6">
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
            <h2 className="text-2xl font-bold text-[#b480e4] dark:text-[#c99df0] mb-4">
                Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                {message}
            </p>
        </div>
    );
} 