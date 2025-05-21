import React, { useState, useEffect } from 'react';
import { Wallet } from "lucide-react";
import { useWallet } from './providers/wallet-provider';
import { usePopup } from "./ui/popup-provider";
import { Link } from "react-router-dom";
import { WalletPopup } from './wallet-popup';

export function WalletButton() {
    const { isConnected } = useWallet();
    const [mounted, setMounted] = useState(false);
    const { openPopup } = usePopup();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        openPopup(<WalletPopup />, "Your Wallet");
    };

    if (!mounted) {
        return (
            <Link
                to="#"
                onClick={handleClick}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] nav-icon-hover"
                aria-label="Connect Wallet"
            >
                <Wallet className="w-6 h-6" />
            </Link>
        );
    }

    return (
        <Link
            to="#"
            onClick={handleClick}
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#b480e4]/10 dark:bg-[#b480e4]/20 hover:bg-[#b480e4]/20 dark:hover:bg-[#b480e4]/30 transition-all text-[#b480e4] dark:text-[#c99df0] nav-icon-hover"
            aria-label={isConnected ? "Wallet - 100 Coins" : "Connect Wallet"}
        >
            <Wallet className="w-6 h-6" />
        </Link>
    );
} 