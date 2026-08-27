import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PriceTag } from './price-tag'
import { WinnerBanner } from './winner-banner'

describe('PriceTag', () => {
  it('shows the rarity label, 1 TYPE, amount, and unit', () => {
    render(<PriceTag type="rare" amount="0.05" unit="ETH" />)
    expect(screen.getByText('RARE')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('TYPE')).toBeInTheDocument()
    expect(screen.getByText('each')).toBeInTheDocument()
    expect(screen.getByText('0.05')).toBeInTheDocument()
    expect(screen.getByText('ETH')).toBeInTheDocument()
  })
})

describe('WinnerBanner', () => {
  it('arcs the winner line in an accessible SVG', () => {
    render(<WinnerBanner />)
    expect(
      screen.getByRole('img', { name: 'Every roll is a winner' })
    ).toBeInTheDocument()
    expect(screen.getByText('Every Roll is a Winner')).toBeInTheDocument()
  })
})
