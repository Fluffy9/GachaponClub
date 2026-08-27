import React, { createContext, useContext, useEffect, useState } from 'react'
import { useWallet as useSuiWallet } from '@suiet/wallet-kit'
import { Transaction } from '@mysten/sui/transactions'
import type { WalletType, TokenBalance, NFT } from '../../lib/wallet-context'
import { getImageUrl } from '../../lib/constants'
import { useAccount, useBalance, useDisconnect, useSwitchChain, useWalletClient } from 'wagmi'
import { base } from 'wagmi/chains'
import { type Address } from 'viem'
import {
    ERC1155_ABI,
    ERC721_ABI,
    MACHINE_ABI,
    evmPublicClient,
    fetchEvmCapsuleBalances,
    fetchEvmPrizePool as fetchEvmPrizes,
    fetchEvmRarities,
    fetchEvmApprovedNfts,
    type EvmRarity,
} from '../../lib/evm'
import {
    suiClient,
    fetchSuiApprovedNfts,
    fetchSuiPrizePool as loadSuiPrizePool,
    fetchSuiOwnedNfts,
    type ApprovedNft,
    type Prize,
} from '../../lib/sui-machine'

export interface WalletContextType {
    walletType: WalletType
    address: string | null
    isConnected: boolean
    chain: string | null
    balances: TokenBalance[]
    nfts: NFT[]
    approvedNFTs: ApprovedNft[]
    prizePool: Prize[]
    connect: (type: WalletType) => Promise<void>
    disconnect: () => void
    callContract: (params: {
        chain: 'sui' | 'eth'
        contractAddress: string
        method: string
        args: any[]
        options?: any
    }) => Promise<any>
    isCallingContract: boolean
    contractCallSuccess: boolean
    contractCallError: string | null
    suiClient: typeof suiClient
    suiWallet: ReturnType<typeof useSuiWallet>
    wallet: {
        signTransaction: (transaction: Transaction) => Promise<any>
    }
    fetchApprovedNFTs: () => Promise<void>
    fetchPrizePool: () => Promise<void>
    fetchNFTs: (address: string) => Promise<void>
    evmRarities: EvmRarity[]
}

const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
    const context = useContext(WalletContext)
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider')
    }
    return context
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [walletType, setWalletType] = useState<WalletType>(null)
    const [address, setAddress] = useState<string | null>(null)
    const [chain, setChain] = useState<string | null>(null)
    const [balances, setBalances] = useState<TokenBalance[]>([])
    const [nfts, setNfts] = useState<NFT[]>([])
    const [approvedNFTs, setApprovedNFTs] = useState<ApprovedNft[]>([])
    const [isInitialized, setIsInitialized] = useState(false)
    const [isCallingContract, setIsCallingContract] = useState(false)
    const [contractCallSuccess, setContractCallSuccess] = useState(false)
    const [contractCallError, setContractCallError] = useState<string | null>(null)
    const [prizePool, setPrizePool] = useState<Prize[]>([])
    const [evmRarities, setEvmRarities] = useState<EvmRarity[]>([])

    const suiWallet = useSuiWallet()
    const { connected: suiConnected, account: suiAccount, select: suiSelect } = suiWallet

    const { address: ethAddress, isConnected: ethConnected, chainId } = useAccount()
    const { data: ethBalance } = useBalance({
        address: ethAddress,
        chainId: base.id,
        query: { enabled: Boolean(ethAddress) },
    })
    const { disconnect: disconnectEth } = useDisconnect()
    const { switchChainAsync } = useSwitchChain()
    const { data: walletClient } = useWalletClient({
        query: { enabled: Boolean(ethAddress && ethConnected) },
    })

    const fetchApprovedNFTs = async () => {
        if (walletType === 'eth' || (ethConnected && !suiConnected)) {
            try {
                const approved = await fetchEvmApprovedNfts()
                setApprovedNFTs(approved.map((nft) => ({
                    type: nft.address,
                    tier: nft.tier,
                    name: `${nft.address.slice(0, 6)}…${nft.address.slice(-4)}`,
                    module: nft.address,
                    packageId: nft.address,
                    imageUrl: getImageUrl(`/${nft.tier}.gif`),
                    description: `${nft.tier} bag`,
                })))
            } catch (error) {
                console.error('Failed to fetch Base approved NFTs:', error)
                setApprovedNFTs([])
            }
            return
        }

        try {
            setApprovedNFTs(await fetchSuiApprovedNfts())
        } catch (error) {
            console.error('Failed to fetch approved NFTs in wallet provider:', error)
            setApprovedNFTs([])
        }
    }

    const loadEvmPublicData = async () => {
        try {
            const [rarities, prizes] = await Promise.all([
                fetchEvmRarities(),
                fetchEvmPrizes(),
            ])
            setEvmRarities(rarities)
            setPrizePool(prizes)
        } catch (error) {
            console.error('Failed to fetch Base machine data:', error)
        }
    }

    const fetchSuiPrizePool = async () => {
        try {
            setPrizePool(await loadSuiPrizePool())
        } catch (error) {
            console.error('Failed to fetch prize pool:', error)
            setPrizePool([])
        }
    }

    const fetchPrizePool = async () => {
        if (suiConnected) {
            await fetchSuiPrizePool()
        } else {
            await loadEvmPublicData()
        }
    }

    const fetchEvmOwnedNfts = async (ownerAddress: string) => {
        try {
            setNfts(await fetchEvmCapsuleBalances(ownerAddress as Address))
        } catch (error) {
            console.error('Failed to fetch Base capsules:', error)
            setNfts([])
        }
    }

    const fetchNFTs = async (ownerAddress: string) => {
        if (ethConnected && !suiConnected) {
            await fetchEvmOwnedNfts(ownerAddress)
            return
        }
        try {
            setNfts(await fetchSuiOwnedNfts(ownerAddress))
        } catch (error) {
            console.error('Failed to fetch NFTs:', error)
            setNfts([])
        }
    }

    useEffect(() => {
        loadEvmPublicData()
    }, [])

    useEffect(() => {
        if (!isInitialized) {
            setIsInitialized(true)
            return
        }

        if (suiConnected && suiAccount) {
            setWalletType('sui')
            setAddress(suiAccount.address)
            setChain('sui')

            const fetchBalance = async () => {
                try {
                    const coins = await suiClient.getCoins({
                        owner: suiAccount.address,
                        coinType: '0x2::sui::SUI',
                    })
                    const totalBalance = coins.data.reduce(
                        (sum: bigint, coin: { balance: string }) => sum + BigInt(coin.balance),
                        0n
                    )
                    setBalances([{ symbol: 'SUI', amount: totalBalance.toString(), decimals: 9 }])
                } catch (error) {
                    console.error('Failed to fetch SUI balance:', error)
                    setBalances([{ symbol: 'SUI', amount: '0', decimals: 9 }])
                }
            }

            fetchBalance()
            Promise.all([
                fetchApprovedNFTs(),
                fetchNFTs(suiAccount.address),
                fetchSuiPrizePool(),
            ])
        }
    }, [suiConnected, suiAccount, isInitialized])

    useEffect(() => {
        if (ethConnected && ethAddress && !suiConnected) {
            setWalletType('eth')
            setAddress(ethAddress)
            setChain('base')
        }
    }, [ethConnected, ethAddress, suiConnected])

    useEffect(() => {
        if (ethConnected && ethBalance && !suiConnected) {
            setBalances([{
                symbol: 'ETH',
                amount: ethBalance.value.toString(),
                decimals: 18,
            }])
        }
    }, [ethConnected, ethBalance, suiConnected])

    useEffect(() => {
        if (ethConnected && ethAddress && !suiConnected) {
            fetchEvmOwnedNfts(ethAddress)
        }
    }, [ethConnected, ethAddress, suiConnected])

    useEffect(() => {
        if (!suiConnected && !ethConnected) {
            setWalletType(null)
            setAddress(null)
            setChain('base')
            setBalances([])
            setNfts([])
            setApprovedNFTs([])
            loadEvmPublicData()
        }
    }, [suiConnected, ethConnected])

    const connect = async (type: WalletType) => {
        if (type === 'sui' && suiSelect) {
            try {
                await suiSelect('Slush')
            } catch (error) {
                console.error('Failed to connect Sui wallet:', error)
            }
        }
    }

    const disconnect = () => {
        if (walletType === 'sui' && suiWallet) {
            suiWallet.disconnect()
        }
        if (ethConnected) {
            disconnectEth()
        }
        setWalletType(null)
        setAddress(null)
        setChain('base')
        setBalances([])
        setNfts([])
        setApprovedNFTs([])
        loadEvmPublicData()
    }

    const callContract = async (params: {
        chain: 'sui' | 'eth'
        contractAddress: string
        method: string
        args: any[]
        options?: any
    }) => {
        try {
            setIsCallingContract(true)
            setContractCallError(null)
            setContractCallSuccess(false)

            if (params.chain === 'eth') {
                if (!walletClient || !ethAddress) {
                    throw new Error('Ethereum wallet not connected')
                }
                if (chainId !== base.id) {
                    await switchChainAsync({ chainId: base.id })
                }

                const abi =
                    params.method === 'setApprovalForAll'
                        ? ERC1155_ABI
                        : params.method === 'approve'
                            ? ERC721_ABI
                            : MACHINE_ABI
                const hash = await walletClient.writeContract({
                    address: params.contractAddress as Address,
                    abi,
                    functionName: params.method,
                    args: params.args,
                    account: ethAddress,
                    chain: base,
                    ...(params.options?.value !== undefined
                        ? { value: params.options.value as bigint }
                        : {}),
                } as Parameters<typeof walletClient.writeContract>[0])
                const receipt = await evmPublicClient.waitForTransactionReceipt({ hash })
                setContractCallSuccess(true)
                return receipt
            }

            if (params.chain !== 'sui') {
                throw new Error('Unsupported chain')
            }

            if (!suiWallet || !suiWallet.account?.address) {
                throw new Error('Sui wallet not found or not connected')
            }

            const owner = suiWallet.account.address
            const tx = new Transaction()
            tx.setSender(owner)

            const [module, functionName] = params.method.split('::')

            if (params.options?.transaction) {
                const txResult = await suiWallet.signAndExecuteTransaction({
                    transaction: params.options.transaction,
                })
                setContractCallSuccess(true)
                return txResult
            }

            if (functionName.startsWith('mint_')) {
                const machineId = params.args[0]
                const amount = BigInt(params.args[1])
                const [paymentCoin] = tx.splitCoins(tx.gas, [amount])
                const moveCall = tx.moveCall({
                    target: `${params.contractAddress}::${module}::${functionName}`,
                    arguments: [tx.object(machineId), paymentCoin],
                })
                tx.transferObjects([moveCall], tx.pure.address(owner))
            } else {
                tx.moveCall({
                    target: `${params.contractAddress}::${module}::${functionName}`,
                    arguments: params.args.map((arg) => {
                        if (typeof arg === 'string' && arg.startsWith('0x')) return tx.object(arg)
                        if (typeof arg === 'string') return tx.pure.string(arg)
                        if (typeof arg === 'bigint') return tx.pure.u64(arg)
                        if (typeof arg === 'number') return tx.pure.u64(BigInt(arg))
                        return arg
                    }),
                })
            }

            const builtTx = await tx.build({ client: suiClient })
            const txResult = await suiWallet.signAndExecuteTransaction({
                transaction: {
                    toJSON: async () => btoa(String.fromCharCode(...builtTx)),
                },
            })

            setContractCallSuccess(true)
            return txResult
        } catch (error) {
            console.error('Contract Call Error:', error)
            setContractCallError(error instanceof Error ? error.message : 'Contract call failed')
            throw error
        } finally {
            setIsCallingContract(false)
        }
    }

    const value: WalletContextType = {
        walletType,
        address,
        isConnected: Boolean(suiConnected || ethConnected),
        chain,
        balances,
        nfts,
        approvedNFTs,
        prizePool,
        connect,
        disconnect,
        callContract,
        isCallingContract,
        contractCallSuccess,
        contractCallError,
        suiClient,
        suiWallet,
        wallet: {
            signTransaction: async (transaction: Transaction) => {
                if (!suiWallet) throw new Error('Wallet not connected')
                return suiWallet.signAndExecuteTransaction({
                    transaction: transaction as unknown as { toJSON: () => Promise<string> },
                })
            },
        },
        fetchApprovedNFTs,
        fetchPrizePool,
        fetchNFTs,
        evmRarities,
    }

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    )
}
