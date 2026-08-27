// import '@rainbow-me/rainbowkit/styles.css'
// import { ClientProviders } from "@/components/providers/client-providers"

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider as SuiWalletProvider, SuietWallet, SlushWallet } from "@suiet/wallet-kit";
import { PopupProvider } from './components/ui/popup-provider';
import { ThemeProvider } from './components/theme-provider';
import Home from './pages/Home';
import Collection from './pages/Collection';
import Admin from './pages/Admin';
import CommonCapsule from './pages/CommonCapsule';
import RareCapsule from './pages/RareCapsule';
import EpicCapsule from './pages/EpicCapsule';
import NotFound from './pages/404';
import './index.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  rainbowWallet,
  metaMaskWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createStorage, noopStorage } from 'wagmi';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { WalletProvider } from './components/providers/wallet-provider';
import { AdminNav } from './components/admin-nav';
import { BASE_RPC_URL, WALLETCONNECT_PROJECT_ID } from './lib/constants';

const config = getDefaultConfig({
  appName: 'Gachapon Club',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [base],
  ssr: false,
  // Do not include walletConnectWallet. RainbowKit registers a second WC
  // connector with showQrModal: true, and its setup() opens the QR overlay on load.
  wallets: [
    {
      groupName: 'Popular',
      wallets: [injectedWallet, rainbowWallet, metaMaskWallet],
    },
  ],
  storage: createStorage({ storage: noopStorage }),
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
});

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config} reconnectOnMount={false}>
        <RainbowKitProvider>
          <SuiWalletProvider autoConnect={false} defaultWallets={[SuietWallet, SlushWallet]}>
            <ThemeProvider defaultTheme="light" storageKey="gacha-theme">
              <WalletProvider>
                <PopupProvider>
                  <Router>
                    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
                      <div className="min-h-screen flex flex-col">
                        <main className="flex-1">
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/collection" element={<Collection />} />
                            <Route path="/admin" element={<Admin />} />
                            <Route path="/common-capsule" element={<CommonCapsule />} />
                            <Route path="/rare-capsule" element={<RareCapsule />} />
                            <Route path="/epic-capsule" element={<EpicCapsule />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                        <AdminNav />
                      </div>
                    </div>
                  </Router>
                </PopupProvider>
              </WalletProvider>
            </ThemeProvider>
          </SuiWalletProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}