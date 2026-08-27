import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
    PendingClaimsPanel,
    RegisterRarityForm,
    RescueStuckDrawForm,
    SetRescueDelayForm,
    WithdrawPrizeForm,
} from './machine-ops'

describe('Machine ops UI', () => {
    it('lets a player submit a stuck-draw rescue', () => {
        const onRescue = vi.fn()
        const onRequestIdChange = vi.fn()
        render(
            <RescueStuckDrawForm
                requestId="99"
                onRequestIdChange={onRequestIdChange}
                onRescue={onRescue}
            />
        )
        expect(screen.getByText('Rescue stuck draw')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Rescue draw' }))
        expect(onRescue).toHaveBeenCalledTimes(1)
    })

    it('lists pending claims from getClaim and claims by index', () => {
        const onClaim = vi.fn()
        render(
            <PendingClaimsPanel
                claimingIndex={null}
                onClaim={onClaim}
                claims={[
                    {
                        index: 0,
                        tokenContract: '0x1111111111111111111111111111111111111111',
                        isERC721: true,
                        assignedAt: 1n,
                        tokenId: 5n,
                        amount: 1n,
                    },
                ]}
            />
        )
        expect(screen.getByText('Pending prize claims')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Claim' }))
        expect(onClaim).toHaveBeenCalledWith(0)
    })

    it('collects withdrawPrize fields', () => {
        const onSubmit = vi.fn()
        render(
            <WithdrawPrizeForm
                rarity="rare"
                index="3"
                tokenContract="0x1111111111111111111111111111111111111111"
                tokenId="8"
                to="0x2222222222222222222222222222222222222222"
                onChange={() => {}}
                onSubmit={onSubmit}
            />
        )
        expect(screen.getByText('Withdraw prize by index')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Withdraw prize' }))
        expect(onSubmit).toHaveBeenCalled()
    })

    it('exposes register rarity and rescue delay admin forms', () => {
        render(
            <>
                <RegisterRarityForm
                    tokenContract=""
                    name=""
                    priceEth=""
                    onChange={() => {}}
                    onSubmit={() => {}}
                />
                <SetRescueDelayForm delaySeconds="86400" onChange={() => {}} onSubmit={() => {}} />
            </>
        )
        expect(screen.getByRole('button', { name: 'Register rarity' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Set rescue delay' })).toBeInTheDocument()
    })
})
