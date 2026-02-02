import { describe, expect, it } from 'vitest'
import { evaluateHit, scoreFromHit, summarizeHits } from './rhythm'

describe('evaluateHit', () => {
  it('returns perfect inside the tight window', () => {
    const result = evaluateHit(1000, 1000)
    expect(result.grade).toBe('perfect')
  })

  it('returns good inside the wider window', () => {
    const result = evaluateHit(1120, 1000)
    expect(result.grade).toBe('good')
  })

  it('returns miss outside the window', () => {
    const result = evaluateHit(1300, 1000)
    expect(result.grade).toBe('miss')
  })
})

describe('scoreFromHit', () => {
  it('maps grades to points', () => {
    expect(scoreFromHit({ grade: 'perfect', timingMs: 0, noteMs: 0, deltaMs: 0 })).toBe(2)
    expect(scoreFromHit({ grade: 'good', timingMs: 0, noteMs: 0, deltaMs: 0 })).toBe(1)
    expect(scoreFromHit({ grade: 'miss', timingMs: 0, noteMs: 0, deltaMs: 0 })).toBe(0)
  })
})

describe('summarizeHits', () => {
  it('summarizes counts and accuracy', () => {
    const summary = summarizeHits([
      { grade: 'perfect', timingMs: 1000, noteMs: 1000, deltaMs: 0 },
      { grade: 'good', timingMs: 1100, noteMs: 1000, deltaMs: 100 },
      { grade: 'miss', timingMs: 1300, noteMs: 1000, deltaMs: 300 },
    ])

    expect(summary.perfect).toBe(1)
    expect(summary.good).toBe(1)
    expect(summary.miss).toBe(1)
    expect(summary.score).toBe(3)
    expect(summary.maxScore).toBe(6)
    expect(summary.accuracy).toBeCloseTo(0.5, 5)
  })
})
