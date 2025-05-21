import { useWallet } from "@suiet/wallet-kit"
import { Button } from "./ui/button"

export function SuietWallet() {
    const { connected, connecting, select, name, account } = useWallet()

    const handleConnect = async (walletName: string) => {
        try {
            await select(walletName)
        } catch (error) {
            console.error("Failed to connect wallet:", error)
        }
    }

    return (
        <div className="bg-[#b480e4]/10 dark:bg-[#b480e4]/20 rounded-xl p-4 text-center">
            <div className="w-full space-y-3">
                <Button
                    onClick={() => handleConnect("Slush")}
                    disabled={connected || connecting}
                    className="w-full bg-[#b480e4] hover:bg-[#9d6ad0] text-white flex items-center justify-center gap-2 py-2 px-4 rounded-lg"
                >
                    {connected && name === "Slush" ? (
                        <>
                            <img src="/sui-logo.png" alt="SUI" className="pixel-icon sui-logo" />
                            <span>Pay in SUI</span>
                        </>
                    ) : connecting && name === "Slush" ? (
                        "Connecting..."
                    ) : (
                        "Connect Slush"
                    )}
                </Button>
            </div>

            {connected && (
                <div className="mt-4">
                    <div className="flex items-center justify-center gap-2">
                        <img
                            src={name === "Rainbow" ? "/rainbow-logo.png" : "/sui-logo.png"}
                            alt={name}
                            className="pixel-icon"
                        />
                        <span className="text-lg font-medium text-[#b480e4] dark:text-[#c99df0]">
                            {name}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                        {account?.address}
                    </p>
                </div>
            )}
        </div>
    )
} 