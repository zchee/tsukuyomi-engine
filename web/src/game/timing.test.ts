import { describe, expect, it } from 'vitest'
import { countdownLabel } from './timing'

describe('countdownLabel', () => {
  it('returns null after start', () => {
    expect(countdownLabel(0)).toBeNull()
    expect(countdownLabel(10)).toBeNull()
  })

  it('returns a label before start', () => {
    expect(countdownLabel(-1)).toBe('Starts in 1')
    expect(countdownLabel(-999)).toBe('Starts in 1')
    expect(countdownLabel(-1001)).toBe('Starts in 2')
  })
})
