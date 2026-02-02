import { describe, expect, it } from 'vitest'
import { getState, resetState, setState } from './state'

describe('state', () => {
  it('resets to the initial state', () => {
    setState({ storyNodeId: 'prelude', hasPlayedRhythm: true, score: null })
    const reset = resetState()
    expect(reset.storyNodeId).toBe('intro')
    expect(reset.hasPlayedRhythm).toBe(false)
    expect(reset.score).toBeNull()
  })

  it('updates the state with setState', () => {
    const updated = setState({ choiceId: 'reply', hasPlayedRhythm: true })
    expect(updated.choiceId).toBe('reply')
    expect(updated.hasPlayedRhythm).toBe(true)
  })

  it('returns a copy to avoid external mutation', () => {
    const snapshot = getState()
    snapshot.storyNodeId = 'mutated'
    const next = getState()
    expect(next.storyNodeId).not.toBe('mutated')
  })
})
