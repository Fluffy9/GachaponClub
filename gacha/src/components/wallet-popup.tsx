"use client"
import React from 'react';
import { Wallet } from "lucide-react"
import { useWallet } from '../components/providers/wallet-provider'
import { usePopup } from "./ui/popup-provider"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { WalletSelector } from './wallet-selector';
import { Inventory } from './inventory';
import { Button } from './ui/button';

export function WalletPopup() {
  const { isConnected, disconnect, balances } = useWallet();

  return (
    <div className="p-6">
      {isConnected ? (
        <div className="space-y-6">
          {/* Balance Display */}
          <div className="bg-[#b480e4]/10 dark:bg-[#b480e4]/20 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">Current Balance</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              {balances.map((balance, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-[#b480e4] dark:text-[#c99df0]">
                    {Number(balance.amount) / Math.pow(10, balance.decimals)}
                  </span>
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {balance.symbol}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Inventory />
          <Button
            variant="outline"
            className="w-full text-gray-600 dark:text-gray-300"
            onClick={disconnect}
          >
            Disconnect Wallet
          </Button>
        </div>
      ) : (
        <WalletSelector />
      )}
    </div>
  );
}

export function WalletButton() {
  const { isConnected } = useWallet()
  const [mounted, setMounted] = useState(false)
  const { openPopup } = usePopup()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openPopup(<WalletPopup />, "Your Wallet")
  }

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
    )
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
  )
}

