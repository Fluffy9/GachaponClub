import { describe, expect, it } from 'vitest'
import {
  formatAddress,
  formatSui,
  hasSufficientBalance,
  mistToSui,
  suiToMist,
  getImageUrl as getLocalImageUrl,
} from './utils'

describe('formatAddress', () => {
  it('keeps the first 6 and last 4 characters', () => {
    expect(formatAddress('0xA8957c7fFCa28727B491c41B19E7175204320608')).toBe(
      '0xA895...0608'
    )
  })
})

describe('SUI / MIST', () => {
  it('treats 1 SUI as 1e9 MIST', () => {
    expect(suiToMist(1)).toBe(1_000_000_000n)
    expect(mistToSui(1_000_000_000n)).toBe(1)
  })

  it('formats MIST as a SUI string with two decimals by default', () => {
    expect(formatSui(1_500_000_000n)).toBe('1.50 SUI')
  })

  it('accepts a MIST balance that covers a MIST price', () => {
    expect(hasSufficientBalance(2_000_000_000n, 1_000_000_000n)).toBe(true)
    expect(hasSufficientBalance(1n, 2n)).toBe(false)
  })

  it('rejects out-of-range balances instead of throwing', () => {
    expect(hasSufficientBalance(-1, 1)).toBe(false)
  })
})

describe('utils getImageUrl', () => {
  it('passes through http(s) URLs', () => {
    expect(getLocalImageUrl('https://example.com/x.png')).toBe(
      'https://example.com/x.png'
    )
  })

  it('prefixes relative paths with /images/', () => {
    expect(getLocalImageUrl('common.gif')).toBe('/images/common.gif')
  })
})
