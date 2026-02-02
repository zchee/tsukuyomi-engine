import { describe, expect, it } from 'vitest'
import { advanceReveal } from './text'

describe('advanceReveal', () => {
  it('advances visible characters over time', () => {
    const next = advanceReveal(0, 500, 20, 100)
    expect(next).toBeCloseTo(10, 5)
  })

  it('clamps to total characters', () => {
    const next = advanceReveal(95, 1000, 20, 100)
    expect(next).toBe(100)
  })

  it('handles empty lines', () => {
    const next = advanceReveal(0, 500, 20, 0)
    expect(next).toBe(0)
  })
})
