import { beforeEach, describe, expect, it } from 'vitest'
import {
  getSettings,
  loadSettings,
  resetSettings,
  saveSettings,
  setSettings,
} from './settings'
import type { Settings } from './types'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
    resetSettings()
  })

  it('returns defaults', () => {
    const settings = getSettings()
    expect(settings.autoAdvance).toBe(false)
    expect(settings.soundEnabled).toBe(true)
    expect(settings.textSpeed).toBe('normal')
  })

  it('updates settings with setSettings', () => {
    const updated = setSettings({ autoAdvance: true })
    expect(updated.autoAdvance).toBe(true)
    expect(updated.soundEnabled).toBe(true)
  })

  it('saves and loads settings', () => {
    const next: Settings = { autoAdvance: true, soundEnabled: false, textSpeed: 'fast' }
    saveSettings(next)
    const loaded = loadSettings()
    expect(loaded).toEqual(next)
  })

  it('returns null for invalid payloads', () => {
    localStorage.setItem('luna-loop-settings', '{invalid')
    expect(loadSettings()).toBeNull()
  })
})
