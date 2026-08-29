import { describe, expect, it } from 'vitest'
import { SPARKLE_CYCLE_S, svgPlayOnce, svgWithPacing } from '../components/pixel-sparkle'

const SAMPLE = `
<g opacity="0">
  <animate attributeName="opacity" values="1;0;0" keyTimes="0;0.5;0.923077" dur="1.04s" repeatCount="indefinite"/>
</g>
`.trim()

describe('pixel sparkle pacing', () => {
  it('holds a 4.2s loop so flashes are not back-to-back', () => {
    expect(SPARKLE_CYCLE_S).toBe(4.2)
  })

  it('tints sprites with currentColor and staggers SMIL begin', () => {
    const out = svgWithPacing('fill="#FFFFFF" ' + SAMPLE, 1.25)
    expect(out).toContain('fill="currentColor"')
    expect(out).toContain('begin="1.25s"')
    expect(out).toContain(`dur="${SPARKLE_CYCLE_S}s"`)
    expect(out).toContain('values="1;0;0;0"')
    expect(out).toMatch(/keyTimes="0\.000000;/)
    expect(out).toContain(';1"')
  })

  it('plays SMIL once instead of looping', () => {
    const out = svgPlayOnce('fill="#FFFFFF" repeatCount="indefinite"')
    expect(out).toContain('fill="currentColor"')
    expect(out).toContain('repeatCount="1"')
    expect(out).not.toContain('repeatCount="indefinite"')
  })
})
