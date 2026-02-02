import { beforeEach, describe, expect, it } from 'vitest'
import { clearProgress, loadProgress, saveProgress } from './storage'
import type { AppState } from './types'

const sampleState: AppState = {
  storyNodeId: 'intro',
  choiceId: 'reply',
  hasPlayedRhythm: false,
  score: null,
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads progress', () => {
    saveProgress(sampleState)
    const loaded = loadProgress()
    expect(loaded).toEqual(sampleState)
  })

  it('clears progress', () => {
    saveProgress(sampleState)
    clearProgress()
    expect(loadProgress()).toBeNull()
  })

  it('returns null for invalid payloads', () => {
    localStorage.setItem('luna-loop-progress', '{invalid')
    expect(loadProgress()).toBeNull()
  })
})
