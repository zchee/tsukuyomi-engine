import { describe, expect, it } from 'vitest'
import { clamp, computeScreenDimensions, mapUvToCanvas } from './geometry'

describe('clamp', () => {
  it('clamps values within bounds', () => {
    const tests = [
      { value: -3, min: 0, max: 10, expected: 0 },
      { value: 3, min: 0, max: 10, expected: 3 },
      { value: 14, min: 0, max: 10, expected: 10 },
    ]

    for (const test of tests) {
      expect(clamp(test.value, test.min, test.max)).toBe(test.expected)
    }
  })

  it('swaps bounds when min is greater than max', () => {
    expect(clamp(5, 10, 0)).toBe(5)
    expect(clamp(-1, 10, 0)).toBe(0)
  })
})

describe('computeScreenDimensions', () => {
  it('computes width from aspect and height', () => {
    const result = computeScreenDimensions(16 / 9, 1.2)
    expect(result.width).toBeCloseTo(2.1333, 3)
    expect(result.height).toBeCloseTo(1.2, 3)
  })

  it('respects maxWidth when provided', () => {
    const result = computeScreenDimensions(16 / 9, 1.2, 2)
    expect(result.width).toBeCloseTo(2, 3)
    expect(result.height).toBeCloseTo(1.125, 3)
  })

  it('falls back to safe defaults for invalid values', () => {
    const result = computeScreenDimensions(-1, -1)
    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
  })
})

describe('mapUvToCanvas', () => {
  it('maps uv coordinates to canvas positions', () => {
    const mapped = mapUvToCanvas({ x: 0.5, y: 0.5 }, 320, 180)
    expect(mapped.x).toBe(160)
    expect(mapped.y).toBe(90)
  })

  it('clamps uv coordinates to the canvas bounds', () => {
    const mapped = mapUvToCanvas({ x: 2, y: -1 }, 100, 50)
    expect(mapped.x).toBe(100)
    expect(mapped.y).toBe(50)
  })
})
