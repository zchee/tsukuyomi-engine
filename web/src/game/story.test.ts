import { describe, expect, it } from 'vitest'
import { getStoryNode, getStoryStartId } from './story'

describe('story', () => {
  it('exposes a start node', () => {
    expect(getStoryStartId()).toBe('intro')
  })

  it('returns the intro node', () => {
    const node = getStoryNode('intro')
    expect(node.id).toBe('intro')
    expect(node.lines.length).toBeGreaterThan(0)
  })

  it('throws on unknown nodes', () => {
    expect(() => getStoryNode('missing-node')).toThrow('Unknown story node')
  })
})
