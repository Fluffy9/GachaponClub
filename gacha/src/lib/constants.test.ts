import { describe, expect, it } from 'vitest'
import {
  CONTRACT_METHODS,
  EVM_CHAIN_IDS,
  EVM_MACHINE_ADDRESS,
  EVM_NFT_ADDRESSES,
  EVM_RARITY_ID,
  getEvmPrices,
  getImageUrl,
} from './constants'

describe('Base v2 machine mapping', () => {
  it('maps capsule colors to rarity ids used by purchase()', () => {
    expect(EVM_RARITY_ID).toEqual({ common: 0, rare: 1, epic: 2 })
  })

  it('points ETH buys at the live Base machine and ERC-1155 capsules', () => {
    expect(EVM_MACHINE_ADDRESS).toBe(
      '0xA8957c7fFCa28727B491c41B19E7175204320608'
    )
    expect(EVM_NFT_ADDRESSES.COMMON).toMatch(/^0x/)
    expect(EVM_NFT_ADDRESSES.RARE).toMatch(/^0x/)
    expect(EVM_NFT_ADDRESSES.EPIC).toMatch(/^0x/)
  })

  it('uses machine::mint_* on Sui and purchase on ETH', () => {
    expect(CONTRACT_METHODS.SUI).toEqual({
      COMMON: 'machine::mint_common',
      RARE: 'machine::mint_rare',
      EPIC: 'machine::mint_epic',
    })
    expect(CONTRACT_METHODS.ETH.COMMON).toBe('purchase')
    expect(CONTRACT_METHODS.ETH.RARE).toBe('purchase')
    expect(CONTRACT_METHODS.ETH.EPIC).toBe('purchase')
  })
})

describe('getEvmPrices', () => {
  it('uses 0.01 / 0.05 / 0.1 ETH on Base', () => {
    const prices = getEvmPrices(EVM_CHAIN_IDS.BASE)
    expect(prices.COMMON).toBe('10000000000000000')
    expect(prices.RARE).toBe('50000000000000000')
    expect(prices.EPIC).toBe('100000000000000000')
  })

  it('is 10x those amounts on Ethereum mainnet', () => {
    const l2 = getEvmPrices(EVM_CHAIN_IDS.BASE)
    const mainnet = getEvmPrices(EVM_CHAIN_IDS.ETHEREUM)
    expect(BigInt(mainnet.COMMON)).toBe(BigInt(l2.COMMON) * 10n)
    expect(BigInt(mainnet.RARE)).toBe(BigInt(l2.RARE) * 10n)
    expect(BigInt(mainnet.EPIC)).toBe(BigInt(l2.EPIC) * 10n)
  })
})

describe('constants getImageUrl', () => {
  it('returns empty string for a missing path', () => {
    expect(getImageUrl('')).toBe('')
  })

  it('rewrites gachapon.club files onto the env base host', () => {
    const url = getImageUrl('https://gachapon.club/common.gif')
    expect(url.endsWith('/common.gif')).toBe(true)
    expect(url.startsWith('http')).toBe(true)
  })

  it('strips a leading slash on relative paths', () => {
    const url = getImageUrl('/capsules/common.png')
    expect(url.endsWith('/capsules/common.png')).toBe(true)
  })
})
