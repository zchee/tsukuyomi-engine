import type { AppState } from './types'
import { getStoryStartId } from './story'

const initialState: AppState = {
  storyNodeId: getStoryStartId(),
  choiceId: undefined,
  hasPlayedRhythm: false,
  score: null,
}

let state: AppState = cloneState(initialState)

export function getState(): AppState {
  return cloneState(state)
}

export function setState(partial: Partial<AppState>): AppState {
  const next: AppState = {
    ...state,
    ...partial,
  }

  if ('score' in partial) {
    next.score = partial.score ?? null
  }

  state = cloneState(next)
  return getState()
}

export function resetState(): AppState {
  state = cloneState(initialState)
  return getState()
}

function cloneState(source: AppState): AppState {
  return {
    storyNodeId: source.storyNodeId,
    choiceId: source.choiceId,
    hasPlayedRhythm: source.hasPlayedRhythm,
    score: source.score ? { ...source.score } : null,
  }
}
