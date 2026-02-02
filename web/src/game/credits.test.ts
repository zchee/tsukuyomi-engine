import { describe, expect, it } from 'vitest'
import rawCredits from './data/credits.json'
import { getCredits } from './credits'

describe('getCredits', () => {
  it('returns credits with entries', () => {
    const credits = getCredits()
    expect(credits.title).toBe(rawCredits.title)
    expect(credits.entries.length).toBe(rawCredits.entries.length)
    expect(credits.entries[0]).toEqual(rawCredits.entries[0])
  })
})
