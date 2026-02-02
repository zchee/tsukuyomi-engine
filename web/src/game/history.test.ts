import { describe, expect, it } from 'vitest'
import { appendHistory } from './history'

describe('appendHistory', () => {
  it('appends a line to history', () => {
    const next = appendHistory(['a'], 'b', 5)
    expect(next).toEqual(['a', 'b'])
  })

  it('trims to max lines', () => {
    const next = appendHistory(['a', 'b', 'c'], 'd', 3)
    expect(next).toEqual(['b', 'c', 'd'])
  })

  it('ignores empty lines', () => {
    const next = appendHistory(['a'], '   ', 5)
    expect(next).toEqual(['a'])
  })

  it('respects non-positive max', () => {
    const next = appendHistory(['a'], 'b', 0)
    expect(next).toEqual(['a'])
  })
})
