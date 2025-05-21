import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'

export function RainbowWallet() {
    const { address, isConnected } = useAccount()

    return (
        <div className="bg-[#b480e4]/10 dark:bg-[#b480e4]/20 rounded-xl p-4 text-center">
            <div className="w-full">
                <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, mounted }) => {
                        return (
                            <Button
                                onClick={openConnectModal}
                                disabled={isConnected || !mounted}
                                className="w-full bg-[#b480e4] hover:bg-[#9d6ad0] text-white flex items-center justify-center gap-2 py-2 px-4 rounded-lg"
                            >
                                {isConnected ? (
                                    <>
                                        <img src="/rainbow-logo.png" alt="Rainbow" className="pixel-icon rainbow-logo" />
                                        <span>Pay in ETH</span>
                                    </>
                                ) : (
                                    "Connect Rainbow"
                                )}
                            </Button>
                        )
                    }}
                </ConnectButton.Custom>
            </div>

            {isConnected && (
                <div className="mt-4">
                    <div className="flex items-center justify-center gap-2">
                        <img src="/rainbow-logo.png" alt="Rainbow" className="pixel-icon rainbow-logo" />
                        <span className="text-lg font-medium text-[#b480e4] dark:text-[#c99df0]">
                            Rainbow
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                        {address}
                    </p>
                </div>
            )}
        </div>
    )
} 