import rawBeatmap from './data/beatmap.json'
import type { Beatmap } from './types'

const beatmap = loadBeatmap(rawBeatmap)

export function getBeatmap(): Beatmap {
  return beatmap
}

function loadBeatmap(value: unknown): Beatmap {
  if (!isBeatmap(value)) {
    throw new Error('Invalid beatmap data')
  }

  return value
}

function isBeatmap(value: unknown): value is Beatmap {
  if (!value || typeof value !== 'object') {
    return false
  }

  const beatmapValue = value as Beatmap
  if (typeof beatmapValue.bpm !== 'number') {
    return false
  }
  if (typeof beatmapValue.offsetMs !== 'number') {
    return false
  }
  if (!Array.isArray(beatmapValue.notes)) {
    return false
  }

  return beatmapValue.notes.every((note) => typeof note === 'number')
}
