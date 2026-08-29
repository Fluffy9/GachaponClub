import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClickSparkles } from './click-sparkles'

function clickAt() {
  act(() => {
    document.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        clientX: 40,
        clientY: 80,
        bubbles: true,
      })
    )
  })
}

describe('ClickSparkles', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('spawns one large primary-purple pixel star', () => {
    render(<ClickSparkles />)
    clickAt()
    const stars = document.querySelectorAll('.click-sparkle')
    expect(stars).toHaveLength(1)
    const star = stars[0] as HTMLElement
    expect(star.style.color).toBe('rgb(180, 128, 228)')
    expect(star.style.opacity).toBe('1')
    expect(star.style.width).toBe('96px')
    expect(star.innerHTML).toContain('repeatCount="1"')
    expect(star.innerHTML).not.toContain('repeatCount="indefinite"')
  })

  it('does not spawn when the user prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })
    )
    render(<ClickSparkles />)
    clickAt()
    expect(document.querySelectorAll('.click-sparkle')).toHaveLength(0)
  })
})
