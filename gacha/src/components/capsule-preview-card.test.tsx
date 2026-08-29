import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CapsulePreviewCard } from './capsule-preview-card'
import { capsuleSparkles } from '../lib/capsule-art'

describe('CapsulePreviewCard', () => {
  it('renders a price-sticker card with an empty capsule', () => {
    render(<CapsulePreviewCard type="rare" />)
    expect(screen.getByText('RARE')).toBeInTheDocument()
    expect(screen.getByText('TYPE')).toBeInTheDocument()
    expect(document.querySelector('[data-capsule-gif-root]')).toBeTruthy()
    expect(document.querySelector('[data-capsule-art]')).toBeTruthy()
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})

describe('capsuleSparkles', () => {
  it('matches homepage sparkle counts per tier', () => {
    expect(capsuleSparkles('common', 0)).toHaveLength(0)
    expect(capsuleSparkles('rare', 1)).toHaveLength(2)
    expect(capsuleSparkles('epic', 2)).toHaveLength(5)
  })
})
