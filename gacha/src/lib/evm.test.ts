import { describe, expect, it } from 'vitest'
import { MACHINE_ABI, formatEth, formatEthAmount } from './evm'

function localeAmount(value: number, digits = 4) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })
}

describe('formatEthAmount', () => {
  it('renders 0.01 ETH from 1e16 wei without a unit', () => {
    expect(formatEthAmount(10n ** 16n)).toBe(localeAmount(0.01))
  })

  it('formatEth appends the ETH suffix', () => {
    expect(formatEth(10n ** 16n)).toBe(`${localeAmount(0.01)} ETH`)
  })
})

describe('MACHINE_ABI', () => {
  const names = MACHINE_ABI.filter((item) => item.type === 'function').map(
    (item) => item.name
  )

  it('exposes the player flow: buy, open, claim', () => {
    expect(names).toEqual(expect.arrayContaining(['purchase', 'play', 'claim']))
  })

  it('exposes donate, withdraw, v2 freeze/rescue, and leftover admin ops', () => {
    expect(names).toEqual(
      expect.arrayContaining([
        'donateNFT',
        'pendingDraws',
        'rescueStuckDraw',
        'getAvailablePrizeCount',
        'withdrawPrize',
        'cancelAdminTransfer',
        'setRescueDelay',
        'registerRarity',
        'setVRFConfig',
      ])
    )
  })
})
