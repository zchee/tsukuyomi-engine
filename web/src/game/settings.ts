import type { Settings } from './types'

const STORAGE_KEY = 'luna-loop-settings'

const defaultSettings: Settings = {
  autoAdvance: false,
  soundEnabled: true,
  textSpeed: 'normal',
}

let settings: Settings = { ...defaultSettings }

export function getSettings(): Settings {
  return { ...settings }
}

export function setSettings(partial: Partial<Settings>): Settings {
  settings = {
    ...settings,
    ...partial,
  }
  return getSettings()
}

export function resetSettings(): Settings {
  settings = { ...defaultSettings }
  return getSettings()
}

export function loadSettings(storage: Storage = window.localStorage): Settings | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isValidSettings(parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSettings(next: Settings, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function isValidSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Settings
  if (typeof candidate.autoAdvance !== 'boolean') {
    return false
  }
  if (typeof candidate.soundEnabled !== 'boolean') {
    return false
  }
  return candidate.textSpeed === 'slow' || candidate.textSpeed === 'normal' || candidate.textSpeed === 'fast'
}
