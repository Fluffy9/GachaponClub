// import '@rainbow-me/rainbowkit/styles.css'

import type { ReactNode } from 'react'
import { Navigation } from './navigation'
import { WalletProvider } from '../lib/wallet-context'
import { ThemeProvider } from './theme-provider'
import { PopupProvider } from './ui/popup-provider'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <WalletProvider>
      <ThemeProvider>
        <PopupProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </PopupProvider>
      </ThemeProvider>
    </WalletProvider>
  )
}
