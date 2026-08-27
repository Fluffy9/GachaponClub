import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useWallet } from '../components/providers/wallet-provider'
import { usePopup } from '../components/ui/popup-provider'
import { WalletPopup } from '../components/wallet-popup'
import {
    SUI_CONTRACT_ADDRESS,
    SUI_MACHINE_ID,
    CONTRACT_METHODS,
    EVM_RARITY_ID,
} from '../lib/constants'
import { machineCall, purchaseWrite } from '../lib/machine-writes'
import { fetchSuiCapsulePrices } from '../lib/sui-machine'

export type CapsuleType = 'common' | 'rare' | 'epic'
type CapsuleTypeUpper = 'COMMON' | 'RARE' | 'EPIC'

export function useCapsuleShop() {
    const { isConnected, callContract, walletType, evmRarities } = useWallet()
    const { openPopup } = usePopup()
    const [isMinting, setIsMinting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [prices, setPrices] = useState<{
        common?: number
        rare?: number
        epic?: number
    }>({})

    useEffect(() => {
        if (!isConnected) return
        fetchSuiCapsulePrices()
            .then((next) => {
                if (next) setPrices(next)
            })
            .catch((err) => console.error('Failed to fetch prices:', err))
    }, [isConnected])

    const buyCapsule = useCallback(async (type: CapsuleType) => {
        try {
            if (!isConnected) {
                openPopup(<WalletPopup />, 'Your Wallet')
                return
            }

            setIsMinting(true)
            setError(null)

            if (walletType === 'eth') {
                const rarityId = EVM_RARITY_ID[type]
                const rarity = evmRarities.find((item) => item.id === rarityId)
                if (!rarity) {
                    throw new Error('Price not available')
                }
                await callContract(machineCall(purchaseWrite(BigInt(rarityId), rarity.price)))
                toast.success('Capsule purchased')
                return
            }

            const price = prices[type]
            if (!price) {
                throw new Error('Price not available')
            }

            const method = CONTRACT_METHODS.SUI[type.toUpperCase() as CapsuleTypeUpper]
            await callContract({
                chain: 'sui',
                contractAddress: SUI_CONTRACT_ADDRESS,
                method,
                args: [SUI_MACHINE_ID, BigInt(price)],
            })

            toast.success('NFT minted successfully')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to mint NFT'
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsMinting(false)
        }
    }, [isConnected, walletType, prices, callContract, evmRarities, openPopup])

    return {
        isConnected,
        walletType,
        evmRarities,
        prices,
        isMinting,
        error,
        buyCapsule,
    }
}
