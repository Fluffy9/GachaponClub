import React from 'react';
import { Wallet } from "lucide-react";
import { useWallet } from './providers/wallet-provider';
import { usePopup } from "./ui/popup-provider";
import { WalletPopup } from './wallet-popup';

export function WalletButton() {
    const { isConnected } = useWallet();
    const { openPopup } = usePopup();

    return (
        <button
            type="button"
            onClick={() => openPopup(<WalletPopup />, "Your Wallet")}
            className="inline-flex items-center justify-center w-12 h-12 p-0 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] nav-icon-hover"
            aria-label={isConnected ? "Wallet" : "Connect Wallet"}
        >
            <Wallet className="w-6 h-6" strokeWidth={2} />
        </button>
    );
}
