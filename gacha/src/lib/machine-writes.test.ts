import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { encodeFunctionData, parseEther, zeroAddress, type Address, type Hex } from 'viem'
import { describe, expect, it } from 'vitest'
import { MACHINE_ABI } from './evm'
import {
    ALL_MACHINE_APP_WRITES,
    MACHINE_ADMIN_WRITES,
    MACHINE_COORDINATOR_ONLY,
    MACHINE_ECONOMIST_WRITES,
    MACHINE_PLAYER_WRITES,
    MACHINE_WRITE_SURFACE,
    acceptAdminWrite,
    approveNftWrite,
    cancelAdminTransferWrite,
    cancelVrfSubscriptionWrite,
    claimWrite,
    createVrfSubscriptionWrite,
    donateNftWrite,
    fundVrfWrite,
    grantRoleWrite,
    loadLastPlayRequestId,
    machineCall,
    mockWalletWrite,
    pauseWrite,
    persistLastPlayRequestId,
    playRequestIdFromReceipt,
    playWrite,
    purchaseWrite,
    redeemPrizeWrite,
    registerRarityWrite,
    rescueStuckDrawWrite,
    revokeRoleWrite,
    setRescueDelayWrite,
    setRarityEnabledWrite,
    setRarityPriceWrite,
    setVrfConfigWrite,
    transferAdminWrite,
    unpauseWrite,
    withdrawPrizeWrite,
    withdrawWrite,
} from './machine-writes'
import { EVM_MACHINE_ADDRESS } from './constants'

const abiNames = MACHINE_ABI.filter((item) => item.type === 'function').map((item) => item.name)

const token = '0x1111111111111111111111111111111111111111' as Address
const to = '0x2222222222222222222222222222222222222222' as Address
const role = ('0x' + 'ab'.repeat(32)) as Hex
const keyHash = ('0x' + 'cd'.repeat(32)) as Hex

const builders: Record<(typeof ALL_MACHINE_APP_WRITES)[number], () => ReturnType<typeof purchaseWrite>> = {
    purchase: () => purchaseWrite(1n, parseEther('0.05')),
    play: () => playWrite(2n),
    claim: () => claimWrite(0n),
    donateNFT: () => donateNftWrite(token, 7n, 1n, 0n),
    rescueStuckDraw: () => rescueStuckDrawWrite(99n),
    fundVrf: () => fundVrfWrite(parseEther('0.005')),
    acceptAdmin: () => acceptAdminWrite(),
    pause: () => pauseWrite(),
    unpause: () => unpauseWrite(),
    setRarityPrice: () => setRarityPriceWrite(1n, parseEther('0.05')),
    setRarityEnabled: () => setRarityEnabledWrite(0n, false),
    approveNFT: () => approveNftWrite(1n, token, true),
    withdraw: () => withdrawWrite(zeroAddress, parseEther('1'), to),
    redeemPrize: () => redeemPrizeWrite(2n, to),
    withdrawPrize: () => withdrawPrizeWrite(1n, 3n, token, 8n, to),
    cancelVrfSubscription: () => cancelVrfSubscriptionWrite(to),
    createVrfSubscription: () => createVrfSubscriptionWrite(),
    transferAdmin: () => transferAdminWrite(to),
    cancelAdminTransfer: () => cancelAdminTransferWrite(),
    grantRole: () => grantRoleWrite(role, to),
    revokeRole: () => revokeRoleWrite(role, to),
    setRescueDelay: () => setRescueDelayWrite(86400n),
    registerRarity: () => registerRarityWrite(token, 'Legendary', parseEther('1')),
    setVRFConfig: () =>
        setVrfConfigWrite({
            coordinator: token,
            keyHash,
            subscriptionId: 12n,
            requestConfirmations: 3,
            callbackGasLimit: 500_000,
            nativePayment: true,
        }),
}

describe('Machine write catalog', () => {
    it('covers every app-facing Machine write in the ABI', () => {
        expect(abiNames).toEqual(expect.arrayContaining([...ALL_MACHINE_APP_WRITES]))
    })

    it('does not expose the Chainlink callback as an app write', () => {
        expect(ALL_MACHINE_APP_WRITES).not.toEqual(
            expect.arrayContaining([...MACHINE_COORDINATOR_ONLY])
        )
        expect([
            ...MACHINE_PLAYER_WRITES,
            ...MACHINE_ECONOMIST_WRITES,
            ...MACHINE_ADMIN_WRITES,
        ]).toHaveLength(ALL_MACHINE_APP_WRITES.length)
    })

    it('maps every app write to a UI surface', () => {
        for (const name of ALL_MACHINE_APP_WRITES) {
            expect(['home', 'inventory', 'admin']).toContain(MACHINE_WRITE_SURFACE[name])
        }
        expect(MACHINE_WRITE_SURFACE.purchase).toBe('home')
        expect(MACHINE_WRITE_SURFACE.play).toBe('inventory')
        expect(MACHINE_WRITE_SURFACE.withdrawPrize).toBe('admin')
    })

    it.each(ALL_MACHINE_APP_WRITES)('encodes %s against MACHINE_ABI and a mock wallet', async (name) => {
        const write = builders[name]()
        expect(write.functionName).toBe(name)
        const data = encodeFunctionData({
            abi: MACHINE_ABI,
            functionName: name,
            args: write.args as never,
        })
        expect(data.startsWith('0x')).toBe(true)
        expect(data.length).toBeGreaterThanOrEqual(10)

        const sent = await mockWalletWrite(write)
        expect(sent).toEqual([write])
    })

    it('purchase sends the rarity id and exact wei as msg.value', () => {
        const write = purchaseWrite(1n, parseEther('0.05'))
        expect(machineCall(write)).toEqual({
            chain: 'eth',
            contractAddress: EVM_MACHINE_ADDRESS,
            method: 'purchase',
            args: [1n],
            options: { value: parseEther('0.05') },
        })
    })

    it('withdrawPrize binds rarity, bag index, token, token id, and recipient', () => {
        expect(withdrawPrizeWrite(1n, 3n, token, 8n, to).args).toEqual([1n, 3n, token, 8n, to])
    })

    it('wires each app write into the Home, inventory, or Admin source', () => {
        const root = resolve(__dirname, '..')
        const read = (...parts: string[]) =>
            parts.map((part) => readFileSync(resolve(root, part), 'utf8')).join('\n')
        const sources = {
            home: read('pages/Home.tsx', 'hooks/use-capsule-shop.tsx'),
            inventory: read('components/inventory.tsx', 'lib/inventory-actions.ts'),
            admin: read('pages/Admin.tsx'),
        }
        const symbols: Record<(typeof ALL_MACHINE_APP_WRITES)[number], string> = {
            purchase: 'purchaseWrite',
            play: 'playWrite',
            claim: 'claimWrite',
            donateNFT: 'donateNftWrite',
            rescueStuckDraw: 'rescueStuckDrawWrite',
            fundVrf: 'fundVrfWrite',
            acceptAdmin: 'acceptAdminWrite',
            pause: 'pauseWrite',
            unpause: 'unpauseWrite',
            setRarityPrice: 'setRarityPriceWrite',
            setRarityEnabled: 'setRarityEnabledWrite',
            approveNFT: 'approveNftWrite',
            withdraw: 'withdrawWrite',
            redeemPrize: 'redeemPrizeWrite',
            withdrawPrize: 'withdrawPrizeWrite',
            cancelVrfSubscription: 'cancelVrfSubscriptionWrite',
            createVrfSubscription: 'createVrfSubscriptionWrite',
            transferAdmin: 'transferAdminWrite',
            cancelAdminTransfer: 'cancelAdminTransferWrite',
            grantRole: 'grantRoleWrite',
            revokeRole: 'revokeRoleWrite',
            setRescueDelay: 'setRescueDelayWrite',
            registerRarity: 'registerRarityWrite',
            setVRFConfig: 'setVrfConfigWrite',
        }
        for (const name of ALL_MACHINE_APP_WRITES) {
            const surface = MACHINE_WRITE_SURFACE[name]
            expect(sources[surface]).toContain(symbols[name])
        }
    })
})

describe('PlayRequested receipt + local rescue id', () => {
    it('returns null when the receipt has no PlayRequested log', () => {
        expect(playRequestIdFromReceipt({ logs: [] })).toBeNull()
        expect(playRequestIdFromReceipt(null)).toBeNull()
    })

    it('persists the last request id for rescue', () => {
        persistLastPlayRequestId(to, 42n)
        expect(loadLastPlayRequestId(to)).toBe('42')
        expect(loadLastPlayRequestId(to.toUpperCase())).toBe('42')
    })
})
