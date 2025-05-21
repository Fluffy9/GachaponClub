// import '@rainbow-me/rainbowkit/styles.css'
// import { ClientProviders } from "@/components/providers/client-providers"

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider as SuiWalletProvider } from "@suiet/wallet-kit";
import { PopupProvider } from './components/ui/popup-provider';
import { ThemeProvider } from './components/theme-provider';
import Home from './pages/Home';
import Collection from './pages/Collection';
import Admin from './pages/Admin';
import CommonCapsule from './pages/CommonCapsule';
import RareCapsule from './pages/RareCapsule';
import EpicCapsule from './pages/EpicCapsule';
import './index.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mainnet, polygon } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { WalletProvider } from './components/providers/wallet-provider';
import { Navigation } from './components/navigation';
import { WalletButton } from './components/wallet-button';
import { AdminNav } from './components/admin-nav';

const config = getDefaultConfig({
  appName: 'Gachapon Club',
  projectId: 'e151333bb1826587cfaf15c54011854a',
  chains: [mainnet, polygon],
});

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>
          <SuiWalletProvider>
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