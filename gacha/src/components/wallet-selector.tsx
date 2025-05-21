import React from 'react';
import { Button } from './ui/button';
import { useWallet } from './providers/wallet-provider';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletSelector() {
    const { walletType, isConnected, connect, disconnect } = useWallet();

    if (!isConnected) {
        return (
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Connect Wallet</h3>
                <div className="grid gap-4">
                    {/* Sui Wallet Button */}
                    <Button
                        onClick={() => connect('sui')}
                        disabled={isConnected}
                        className="w-full bg-[#b480e4] hover:bg-[#9d6ad0] text-white flex items-center justify-center gap-2 py-2 px-4 rounded-lg"
                    >
                        {walletType === 'sui' ? (
                            <>
                                <img src="/sui-logo.png" alt="SUI" className="w-6 h-6 object-contain" />
                                <span>Pay in SUI</span>
                            </>
                        ) : (
                            "Connect Slush"
                        )}
                    </Button>

                    {/* Ethereum Wallet Button */}
                    <ConnectButton.Custom>
                        {({ account, chain, openConnectModal, mounted }) => {
                            return (
                                <Button
                                    onClick={openConnectModal}
                                    disabled={isConnected || !mounted}
                                    className="hidden w-full bg-[#b480e4] hover:bg-[#9d6ad0] text-white flex items-center justify-center gap-2 py-2 px-4 rounded-lg"
                                >
                                    {walletType === 'eth' ? (
                                        <>
                                            <img src="/rainbow-logo.png" alt="Rainbow" className="w-6 h-6 object-contain" />
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
            </div>
        );
    }

    return null;
} 