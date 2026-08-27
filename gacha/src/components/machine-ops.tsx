import { useState } from 'react'
import type { Address, Hex } from 'viem'
import type { EvmPrizeClaim, PrizeType } from '../lib/evm'

const fieldClass =
    'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm'

const buttonClass =
    'px-4 py-2 bg-[#b480e4] hover:bg-[#9d6ad0] text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed'

export function RescueStuckDrawForm({
    requestId,
    onRequestIdChange,
    onRescue,
    disabled,
}: {
    requestId: string
    onRequestIdChange: (value: string) => void
    onRescue: () => void
    disabled?: boolean
}) {
    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Rescue stuck draw</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                If Chainlink never callbacks, paste the play request id. Players can rescue after the
                rescue delay; admins can rescue immediately. You get a capsule refund to claim.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
                <label className="flex-1 w-full text-sm">
                    <span className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                        VRF request id
                    </span>
                    <input
                        value={requestId}
                        onChange={(e) => onRequestIdChange(e.target.value)}
                        placeholder="123…"
                        className={fieldClass}
                    />
                </label>
                <button type="button" onClick={onRescue} disabled={disabled || !requestId} className={buttonClass}>
                    Rescue draw
                </button>
            </div>
        </div>
    )
}

export function PendingClaimsPanel({
    claims,
    onClaim,
    claimingIndex,
}: {
    claims: EvmPrizeClaim[]
    onClaim: (index: number) => void
    claimingIndex: number | null
}) {
    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Pending prize claims</h4>
            {claims.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No unclaimed prizes.</p>
            ) : (
                <ul className="space-y-2">
                    {claims.map((claim) => (
                        <li key={claim.index} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                                #{claim.index} · {claim.isERC721 ? 'ERC-721' : 'ERC-1155'} · token {claim.tokenId.toString()}
                            </span>
                            <button
                                type="button"
                                onClick={() => onClaim(claim.index)}
                                disabled={claimingIndex === claim.index}
                                className={buttonClass}
                            >
                                {claimingIndex === claim.index ? 'Claiming…' : 'Claim'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export function WithdrawPrizeForm({
    rarity,
    index,
    tokenContract,
    tokenId,
    to,
    onChange,
    onSubmit,
    disabled,
}: {
    rarity: PrizeType
    index: string
    tokenContract: string
    tokenId: string
    to: string
    onChange: (field: 'rarity' | 'index' | 'tokenContract' | 'tokenId' | 'to', value: string) => void
    onSubmit: () => void
    disabled?: boolean
}) {
    return (
        <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Withdraw prize by index
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Pull a specific bag slot. Token contract and id must match the slot so a VRF swap cannot
                redirect the withdrawal.
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm">
                    <span className="block font-medium mb-1">Bag</span>
                    <select
                        value={rarity}
                        onChange={(e) => onChange('rarity', e.target.value)}
                        className={fieldClass}
                    >
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="epic">Epic</option>
                    </select>
                </label>
                <label className="text-sm">
                    <span className="block font-medium mb-1">Index</span>
                    <input value={index} onChange={(e) => onChange('index', e.target.value)} className={fieldClass} />
                </label>
                <label className="text-sm">
                    <span className="block font-medium mb-1">Token contract</span>
                    <input
                        value={tokenContract}
                        onChange={(e) => onChange('tokenContract', e.target.value)}
                        placeholder="0x…"
                        className={fieldClass}
                    />
                </label>
                <label className="text-sm">
                    <span className="block font-medium mb-1">Token id</span>
                    <input value={tokenId} onChange={(e) => onChange('tokenId', e.target.value)} className={fieldClass} />
                </label>
                <label className="text-sm sm:col-span-2">
                    <span className="block font-medium mb-1">Recipient</span>
                    <input value={to} onChange={(e) => onChange('to', e.target.value)} placeholder="0x…" className={fieldClass} />
                </label>
                <button type="button" onClick={onSubmit} disabled={disabled} className={buttonClass}>
                    Withdraw prize
                </button>
            </div>
        </div>
    )
}

export function RegisterRarityForm({
    tokenContract,
    name,
    priceEth,
    onChange,
    onSubmit,
    disabled,
}: {
    tokenContract: string
    name: string
    priceEth: string
    onChange: (field: 'tokenContract' | 'name' | 'priceEth', value: string) => void
    onSubmit: () => void
    disabled?: boolean
}) {
    return (
        <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Register rarity</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                    value={tokenContract}
                    onChange={(e) => onChange('tokenContract', e.target.value)}
                    placeholder="Capsule ERC-1155 0x…"
                    className={fieldClass}
                />
                <input
                    value={name}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="Name"
                    className={fieldClass}
                />
                <input
                    value={priceEth}
                    onChange={(e) => onChange('priceEth', e.target.value)}
                    placeholder="Price in ETH"
                    className={fieldClass}
                />
                <button type="button" onClick={onSubmit} disabled={disabled} className={buttonClass}>
                    Register rarity
                </button>
            </div>
        </div>
    )
}

export function SetRescueDelayForm({
    delaySeconds,
    onChange,
    onSubmit,
    disabled,
}: {
    delaySeconds: string
    onChange: (value: string) => void
    onSubmit: () => void
    disabled?: boolean
}) {
    return (
        <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Rescue delay</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col sm:flex-row gap-4 items-end">
                <label className="flex-1 w-full text-sm">
                    <span className="block font-medium mb-1">Seconds before a player can rescue</span>
                    <input value={delaySeconds} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
                </label>
                <button type="button" onClick={onSubmit} disabled={disabled} className={buttonClass}>
                    Set rescue delay
                </button>
            </div>
        </div>
    )
}

export function SetVrfConfigForm({
    disabled,
    onSubmit,
}: {
    disabled?: boolean
    onSubmit: (config: {
        coordinator: Address
        keyHash: Hex
        subscriptionId: bigint
        requestConfirmations: number
        callbackGasLimit: number
        nativePayment: boolean
    }) => void
}) {
    const [coordinator, setCoordinator] = useState('')
    const [keyHash, setKeyHash] = useState('')
    const [subscriptionId, setSubscriptionId] = useState('0')
    const [requestConfirmations, setRequestConfirmations] = useState('3')
    const [callbackGasLimit, setCallbackGasLimit] = useState('500000')
    const [nativePayment, setNativePayment] = useState(true)

    return (
        <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">VRF config</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Coordinator is locked to the existing Chainlink address on-chain. Fails while any draw is
                pending.
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={coordinator} onChange={(e) => setCoordinator(e.target.value)} placeholder="Coordinator 0x…" className={fieldClass} />
                <input value={keyHash} onChange={(e) => setKeyHash(e.target.value)} placeholder="Key hash 0x…" className={fieldClass} />
                <input value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} placeholder="Subscription id" className={fieldClass} />
                <input value={requestConfirmations} onChange={(e) => setRequestConfirmations(e.target.value)} placeholder="Confirmations" className={fieldClass} />
                <input value={callbackGasLimit} onChange={(e) => setCallbackGasLimit(e.target.value)} placeholder="Callback gas" className={fieldClass} />
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={nativePayment} onChange={(e) => setNativePayment(e.target.checked)} />
                    Native payment
                </label>
                <button
                    type="button"
                    disabled={disabled}
                    className={buttonClass}
                    onClick={() =>
                        onSubmit({
                            coordinator: coordinator as Address,
                            keyHash: keyHash as Hex,
                            subscriptionId: BigInt(subscriptionId || '0'),
                            requestConfirmations: Number(requestConfirmations),
                            callbackGasLimit: Number(callbackGasLimit),
                            nativePayment,
                        })
                    }
                >
                    Update VRF config
                </button>
            </div>
        </div>
    )
}
