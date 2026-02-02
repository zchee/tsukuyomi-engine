import { describe, expect, it } from 'vitest'
import { getCredits } from './credits'

describe('getCredits', () => {
  it('returns credits with entries', () => {
    const credits = getCredits()
    expect(credits.title).toBe('CREDITS')
    expect(credits.entries.length).toBeGreaterThan(0)
  })
})
