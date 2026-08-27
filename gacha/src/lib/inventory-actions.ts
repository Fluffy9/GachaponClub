import { Transaction } from '@mysten/sui/transactions'
import type { SuiClient } from '@mysten/sui/client'
import { isAddress, type Address } from 'viem'
import {
    EVM_MACHINE_ADDRESS,
    EVM_NFT_ADDRESSES,
    EVM_RARITY_ID,
    SUI_CONTRACT_ADDRESS,
    SUI_MACHINE_ID,
    SUI_RANDOM_ID,
} from './constants'
import {
    getEvmClaimCount,
    isCapsuleApproved,
    fetchPendingDraws,
} from './evm'
import {
    claimWrite,
    donateNftWrite,
    machineCall,
    persistLastPlayRequestId,
    playRequestIdFromReceipt,
    playWrite,
    rescueStuckDrawWrite,
} from './machine-writes'
import type { NFT } from './wallet-context'

export type CallContract = (params: {
    chain: 'sui' | 'eth'
    contractAddress: string
    method: string
    args: unknown[]
    options?: Record<string, unknown>
}) => Promise<any>

export async function donateEvmNft(params: {
    callContract: CallContract
    address: string
    donateContract: string
    donateTokenId: string
    donateAmount: string
    donateStandard: 'erc721' | 'erc1155'
    donateTier: 'common' | 'rare' | 'epic'
    allowedTiers: Array<'common' | 'rare' | 'epic'>
}) {
    const {
        callContract, address, donateContract, donateTokenId, donateAmount,
        donateStandard, donateTier, allowedTiers,
    } = params
    if (!isAddress(donateContract)) throw new Error('Enter an NFT contract address')
    if (!donateTokenId) throw new Error('Enter a token id')
    const rarityId = EVM_RARITY_ID[donateTier]
    if (allowedTiers.length > 0 && !allowedTiers.includes(donateTier)) {
        throw new Error(`This collection is not approved for the ${donateTier} bag`)
    }
    const tokenId = BigInt(donateTokenId)
    const amount = donateStandard === 'erc721' ? 1n : BigInt(donateAmount || '1')
    if (amount < 1n) throw new Error('Amount must be at least 1')

    const pending = await fetchPendingDraws(BigInt(rarityId))
    if (pending > 0n) {
        throw new Error('This bag has a draw in flight. Wait a moment, or buy a capsule instead.')
    }

    if (donateStandard === 'erc721') {
        await callContract({
            chain: 'eth',
            contractAddress: donateContract,
            method: 'approve',
            args: [EVM_MACHINE_ADDRESS as Address, tokenId],
        })
    } else {
        await callContract({
            chain: 'eth',
            contractAddress: donateContract,
            method: 'setApprovalForAll',
            args: [EVM_MACHINE_ADDRESS as Address, true],
        })
    }

    await callContract(machineCall(
        donateNftWrite(donateContract as Address, tokenId, amount, BigInt(rarityId))
    ))
    return { label: `Donated to ${donateTier} bag`, address }
}

export async function rescueStuckDraw(callContract: CallContract, requestId: string) {
    if (!requestId) throw new Error('Enter a VRF request id')
    await callContract(machineCall(rescueStuckDrawWrite(BigInt(requestId))))
}

export async function claimPrize(callContract: CallContract, index: number) {
    await callContract(machineCall(claimWrite(BigInt(index))))
}

export async function donateSuiNft(params: {
    callContract: CallContract
    suiClient: SuiClient
    address: string
    nft: NFT
    approvedNFTs: Array<{ type: string; module: string; tier: string }>
}) {
    const { callContract, suiClient, address, nft, approvedNFTs } = params
    const contractAddress = SUI_CONTRACT_ADDRESS.startsWith('0x')
        ? SUI_CONTRACT_ADDRESS.slice(2)
        : SUI_CONTRACT_ADDRESS
    const nftType = nft.type.startsWith('0x') ? nft.type.slice(2) : nft.type
    if (!nftType.startsWith(contractAddress)) {
        throw new Error('NFT is not from current deployment')
    }

    const approvedNFT = approvedNFTs.find(
        (approved) =>
            (approved.type === nft.type || nft.type.includes(approved.module)) &&
            nftType.startsWith(contractAddress)
    )
    if (!approvedNFT) {
        throw new Error('NFT type not approved for donation or not from current contract')
    }
    if (!['common', 'rare', 'epic'].includes(approvedNFT.tier)) {
        throw new Error(`Invalid tier: ${approvedNFT.tier}`)
    }

    const functionName = `donate_nft_${approvedNFT.tier}`
    const tx = new Transaction()
    tx.setSender(address)
    const resultObject = tx.moveCall({
        target: `${SUI_CONTRACT_ADDRESS}::machine::${functionName}`,
        typeArguments: [approvedNFT.type],
        arguments: [tx.object(SUI_MACHINE_ID), tx.object(nft.id)],
    })
    tx.transferObjects([resultObject], tx.pure.address(address))

    const result = await callContract({
        chain: 'sui',
        contractAddress: SUI_CONTRACT_ADDRESS,
        method: `machine::${functionName}`,
        args: [],
        options: { transaction: tx, gasBudget: 100000000 },
    })
    if (!result?.digest) {
        throw new Error('Transaction failed - no digest returned')
    }
    await suiClient.waitForTransaction({ digest: result.digest })
}

export async function redeemEvmCapsule(params: {
    callContract: CallContract
    address: string
    capsuleId: string
    onRequestId?: (requestId: bigint) => void
}) {
    const { callContract, address, capsuleId, onRequestId } = params
    const rarityKey = capsuleId as keyof typeof EVM_RARITY_ID
    const rarityId = EVM_RARITY_ID[rarityKey]
    const nftAddress = EVM_NFT_ADDRESSES[rarityKey.toUpperCase() as keyof typeof EVM_NFT_ADDRESSES]
    if (rarityId === undefined || !nftAddress) {
        throw new Error(`Invalid capsule: ${capsuleId}`)
    }

    const approved = await isCapsuleApproved(address as Address, nftAddress)
    if (!approved) {
        await callContract({
            chain: 'eth',
            contractAddress: nftAddress,
            method: 'setApprovalForAll',
            args: [EVM_MACHINE_ADDRESS, true],
        })
    }

    const before = await getEvmClaimCount(address as Address)
    const receipt = await callContract(machineCall(playWrite(BigInt(rarityId))))
    const requestId = playRequestIdFromReceipt(receipt)
    if (requestId != null) {
        persistLastPlayRequestId(address, requestId)
        onRequestId?.(requestId)
    }

    let claimed = false
    for (let i = 0; i < 40; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const count = await getEvmClaimCount(address as Address)
        if (count > before) {
            await callContract(machineCall(claimWrite(0n)))
            claimed = true
            break
        }
    }

    if (!claimed) {
        throw new Error(
            requestId != null
                ? `Draw ${requestId} is still pending. Wait for VRF, claim below, or rescue after the delay.`
                : 'Draw is still pending. Open inventory again to claim, or rescue with the request id.'
        )
    }
}

export async function redeemSuiCapsule(params: {
    callContract: CallContract
    address: string
    capsuleId: string
    capsuleName: string
    nfts: NFT[]
}) {
    const { callContract, address, capsuleId, nfts } = params
    const nftToTrade = nfts.find((nft) => {
        const contractAddress = SUI_CONTRACT_ADDRESS.startsWith('0x')
            ? SUI_CONTRACT_ADDRESS.slice(2)
            : SUI_CONTRACT_ADDRESS
        const nftType = nft.type.startsWith('0x') ? nft.type.slice(2) : nft.type
        return (
            nft.name.toLowerCase().includes(capsuleId.toLowerCase()) &&
            nft.name.toLowerCase().includes('gacha') &&
            nftType.startsWith(contractAddress)
        )
    })
    if (!nftToTrade) {
        throw new Error('NFT not found or not from current deployment')
    }
    const tier = capsuleId.toLowerCase()
    if (!['common', 'rare', 'epic'].includes(tier)) {
        throw new Error(`Invalid tier: ${tier}`)
    }

    const functionName = `trade_${tier}`
    const tx = new Transaction()
    tx.setSender(address)
    const moveCall = tx.moveCall({
        target: `${SUI_CONTRACT_ADDRESS}::machine::${functionName}`,
        arguments: [
            tx.object(SUI_MACHINE_ID),
            tx.object(nftToTrade.id),
            tx.object(SUI_RANDOM_ID),
        ],
    })
    tx.transferObjects([moveCall], tx.pure.address(address))

    const result = await callContract({
        chain: 'sui',
        contractAddress: SUI_CONTRACT_ADDRESS,
        method: `machine::${functionName}`,
        args: [SUI_MACHINE_ID, nftToTrade.id, SUI_RANDOM_ID],
        options: { transaction: tx, gasBudget: 100000000 },
    })
    if (!result?.digest) {
        throw new Error('Transaction failed - no digest returned')
    }
}

export async function burnSuiNft(params: {
    callContract: CallContract
    suiClient: SuiClient
    address: string
    nft: NFT
}) {
    const { callContract, suiClient, address, nft } = params
    const contractAddress = SUI_CONTRACT_ADDRESS.startsWith('0x')
        ? SUI_CONTRACT_ADDRESS.slice(2)
        : SUI_CONTRACT_ADDRESS
    const nftType = nft.type.startsWith('0x') ? nft.type.slice(2) : nft.type
    if (!nftType.startsWith(contractAddress)) {
        throw new Error('NFT is not from current deployment')
    }

    const tx = new Transaction()
    tx.setSender(address)
    tx.transferObjects(
        [tx.object(nft.id)],
        tx.pure.address('0x0000000000000000000000000000000000000000000000000000000000000000')
    )

    const result = await callContract({
        chain: 'sui',
        contractAddress: SUI_CONTRACT_ADDRESS,
        method: 'transferObjects',
        args: [nft.id, '0x0000000000000000000000000000000000000000000000000000000000000000'],
        options: { transaction: tx, gasBudget: 100000000 },
    })
    if (!result?.digest) {
        throw new Error('Transaction failed - no digest returned')
    }
    await suiClient.waitForTransaction({ digest: result.digest })
}
