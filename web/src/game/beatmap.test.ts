import { describe, expect, it } from 'vitest'
import { getBeatmap } from './beatmap'

describe('getBeatmap', () => {
  it('returns a beatmap with sorted notes', () => {
    const beatmap = getBeatmap()
    expect(beatmap.bpm).toBeGreaterThan(0)
    expect(beatmap.offsetMs).toBeGreaterThanOrEqual(0)
    expect(beatmap.notes.length).toBeGreaterThan(0)

    const sorted = [...beatmap.notes].sort((a, b) => a - b)
    expect(beatmap.notes).toEqual(sorted)
  })
})
