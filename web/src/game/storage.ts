import type { AppState } from './types'

const STORAGE_KEY = 'luna-loop-progress'

export function saveProgress(progress: AppState, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function loadProgress(storage: Storage = window.localStorage): AppState | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!isValidProgress(parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearProgress(storage: Storage = window.localStorage): void {
  storage.removeItem(STORAGE_KEY)
}

function isValidProgress(value: Partial<AppState>): value is AppState {
  if (!value || typeof value !== 'object') {
    return false
  }
  if (typeof value.storyNodeId !== 'string') {
    return false
  }
  if (typeof value.hasPlayedRhythm !== 'boolean') {
    return false
  }
  if (value.choiceId !== undefined && typeof value.choiceId !== 'string') {
    return false
  }
  if (value.score === null) {
    return true
  }
  if (value.score === undefined) {
    return false
  }
  const score = value.score
  return (
    typeof score.perfect === 'number' &&
    typeof score.good === 'number' &&
    typeof score.miss === 'number' &&
    typeof score.score === 'number' &&
    typeof score.maxScore === 'number' &&
    typeof score.accuracy === 'number'
  )
}
