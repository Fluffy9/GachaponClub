import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminNav } from './admin-nav'

vi.mock('./wallet-button', () => ({
  WalletButton: () => <button type="button" aria-label="Connect Wallet">wallet</button>,
}))

describe('AdminNav', () => {
  it('drops up home, collection, wallet, and admin when opened', () => {
    render(
      <MemoryRouter>
        <AdminNav />
      </MemoryRouter>
    )
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()

    act(() => {
      screen.getByRole('button', { name: 'Open menu' }).click()
    })

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Collection' })).toHaveAttribute(
      'href',
      '/collection'
    )
    expect(screen.getByRole('button', { name: 'Connect Wallet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })
})
