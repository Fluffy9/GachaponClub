import { type Address, type Hex, parseEventLogs, type Log } from 'viem'
import { EVM_MACHINE_ADDRESS } from './constants'
import { MACHINE_ABI } from './evm'

export type MachineWrite = {
    functionName: string
    args: readonly unknown[]
    value?: bigint
}

/** Player / permissionless Machine writes (not Chainlink). */
export const MACHINE_PLAYER_WRITES = [
    'purchase',
    'play',
    'claim',
    'donateNFT',
    'rescueStuckDraw',
    'fundVrf',
    'acceptAdmin',
] as const

export const MACHINE_ECONOMIST_WRITES = [
    'pause',
    'unpause',
    'setRarityPrice',
    'setRarityEnabled',
] as const

export const MACHINE_ADMIN_WRITES = [
    'approveNFT',
    'withdraw',
    'redeemPrize',
    'withdrawPrize',
    'cancelVrfSubscription',
    'createVrfSubscription',
    'transferAdmin',
    'cancelAdminTransfer',
    'grantRole',
    'revokeRole',
    'setRescueDelay',
    'registerRarity',
    'setVRFConfig',
] as const

/** VRF callback — coordinator only, no app UI. */
export const MACHINE_COORDINATOR_ONLY = ['rawFulfillRandomWords'] as const

export const ALL_MACHINE_APP_WRITES = [
    ...MACHINE_PLAYER_WRITES,
    ...MACHINE_ECONOMIST_WRITES,
    ...MACHINE_ADMIN_WRITES,
] as const

export const MACHINE_WRITE_SURFACE: Record<(typeof ALL_MACHINE_APP_WRITES)[number], 'home' | 'inventory' | 'admin'> = {
    purchase: 'home',
    play: 'inventory',
    claim: 'inventory',
    donateNFT: 'inventory',
    rescueStuckDraw: 'inventory',
    fundVrf: 'admin',
    acceptAdmin: 'admin',
    pause: 'admin',
    unpause: 'admin',
    setRarityPrice: 'admin',
    setRarityEnabled: 'admin',
    approveNFT: 'admin',
    withdraw: 'admin',
    redeemPrize: 'admin',
    withdrawPrize: 'admin',
    cancelVrfSubscription: 'admin',
    createVrfSubscription: 'admin',
    transferAdmin: 'admin',
    cancelAdminTransfer: 'admin',
    grantRole: 'admin',
    revokeRole: 'admin',
    setRescueDelay: 'admin',
    registerRarity: 'admin',
    setVRFConfig: 'admin',
}

export function machineCall(write: MachineWrite) {
    return {
        chain: 'eth' as const,
        contractAddress: EVM_MACHINE_ADDRESS,
        method: write.functionName,
        args: [...write.args],
        ...(write.value !== undefined ? { options: { value: write.value } } : {}),
    }
}

export function purchaseWrite(rarityId: bigint, priceWei: bigint): MachineWrite {
    return { functionName: 'purchase', args: [rarityId], value: priceWei }
}

export function playWrite(rarityId: bigint): MachineWrite {
    return { functionName: 'play', args: [rarityId] }
}

export function claimWrite(index: bigint): MachineWrite {
    return { functionName: 'claim', args: [index] }
}

export function donateNftWrite(
    tokenContract: Address,
    tokenId: bigint,
    amount: bigint,
    rarityId: bigint
): MachineWrite {
    return { functionName: 'donateNFT', args: [tokenContract, tokenId, amount, rarityId] }
}

export function rescueStuckDrawWrite(requestId: bigint): MachineWrite {
    return { functionName: 'rescueStuckDraw', args: [requestId] }
}

export function fundVrfWrite(value: bigint): MachineWrite {
    return { functionName: 'fundVrf', args: [], value }
}

export function acceptAdminWrite(): MachineWrite {
    return { functionName: 'acceptAdmin', args: [] }
}

export function pauseWrite(): MachineWrite {
    return { functionName: 'pause', args: [] }
}

export function unpauseWrite(): MachineWrite {
    return { functionName: 'unpause', args: [] }
}

export function setRarityPriceWrite(rarityId: bigint, price: bigint): MachineWrite {
    return { functionName: 'setRarityPrice', args: [rarityId, price] }
}

export function setRarityEnabledWrite(rarityId: bigint, enabled: boolean): MachineWrite {
    return { functionName: 'setRarityEnabled', args: [rarityId, enabled] }
}

export function approveNftWrite(rarityId: bigint, tokenContract: Address, approve: boolean): MachineWrite {
    return { functionName: 'approveNFT', args: [rarityId, tokenContract, approve] }
}

export function withdrawWrite(token: Address, amount: bigint, to: Address): MachineWrite {
    return { functionName: 'withdraw', args: [token, amount, to] }
}

export function redeemPrizeWrite(rarityId: bigint, to: Address): MachineWrite {
    return { functionName: 'redeemPrize', args: [rarityId, to] }
}

export function withdrawPrizeWrite(
    rarityId: bigint,
    index: bigint,
    tokenContract: Address,
    tokenId: bigint,
    to: Address
): MachineWrite {
    return { functionName: 'withdrawPrize', args: [rarityId, index, tokenContract, tokenId, to] }
}

export function cancelVrfSubscriptionWrite(to: Address): MachineWrite {
    return { functionName: 'cancelVrfSubscription', args: [to] }
}

export function createVrfSubscriptionWrite(): MachineWrite {
    return { functionName: 'createVrfSubscription', args: [] }
}

export function transferAdminWrite(newAdmin: Address): MachineWrite {
    return { functionName: 'transferAdmin', args: [newAdmin] }
}

export function cancelAdminTransferWrite(): MachineWrite {
    return { functionName: 'cancelAdminTransfer', args: [] }
}

export function grantRoleWrite(role: Hex, account: Address): MachineWrite {
    return { functionName: 'grantRole', args: [role, account] }
}

export function revokeRoleWrite(role: Hex, account: Address): MachineWrite {
    return { functionName: 'revokeRole', args: [role, account] }
}

export function setRescueDelayWrite(delay: bigint): MachineWrite {
    return { functionName: 'setRescueDelay', args: [delay] }
}

export function registerRarityWrite(tokenContract: Address, name: string, price: bigint): MachineWrite {
    return { functionName: 'registerRarity', args: [tokenContract, name, price] }
}

export type VrfConfigInput = {
    coordinator: Address
    keyHash: Hex
    subscriptionId: bigint
    requestConfirmations: number
    callbackGasLimit: number
    nativePayment: boolean
}

export function setVrfConfigWrite(config: VrfConfigInput): MachineWrite {
    return { functionName: 'setVRFConfig', args: [config] }
}

const PLAY_REQUEST_KEY = (address: string) => `gacha:lastPlayRequest:${address.toLowerCase()}`
const playRequestMemory = new Map<string, string>()

function writePlayRequest(key: string, value: string) {
    playRequestMemory.set(key, value)
    try {
        globalThis.localStorage?.setItem(key, value)
    } catch {
        // jsdom or private-mode storage
    }
}

function readPlayRequest(key: string): string {
    try {
        return globalThis.localStorage?.getItem(key) ?? playRequestMemory.get(key) ?? ''
    } catch {
        return playRequestMemory.get(key) ?? ''
    }
}

export function persistLastPlayRequestId(address: string, requestId: bigint) {
    writePlayRequest(PLAY_REQUEST_KEY(address), requestId.toString())
}

export function loadLastPlayRequestId(address: string): string {
    return readPlayRequest(PLAY_REQUEST_KEY(address))
}

export function playRequestIdFromReceipt(receipt: { logs?: Log[] } | null | undefined): bigint | null {
    if (!receipt?.logs?.length) return null
    try {
        const logs = parseEventLogs({
            abi: MACHINE_ABI,
            logs: receipt.logs,
            eventName: 'PlayRequested',
        })
        const requestId = logs[0]?.args.requestId
        return typeof requestId === 'bigint' ? requestId : null
    } catch {
        return null
    }
}

export async function mockWalletWrite(write: MachineWrite) {
    const sent: MachineWrite[] = []
    const writeContract = async (call: MachineWrite) => {
        sent.push(call)
        return { status: 'success' as const }
    }
    await writeContract(write)
    return sent
}
