import { GOOD_WINDOW_MS, PERFECT_WINDOW_MS } from './constants'
import type { HitGrade, HitResult, ScoreSummary } from './types'

export function evaluateHit(inputMs: number, noteMs: number): HitResult {
  const deltaMs = inputMs - noteMs
  const absDelta = Math.abs(deltaMs)
  let grade: HitGrade = 'miss'

  if (absDelta <= PERFECT_WINDOW_MS) {
    grade = 'perfect'
  } else if (absDelta <= GOOD_WINDOW_MS) {
    grade = 'good'
  }

  return {
    grade,
    timingMs: inputMs,
    noteMs,
    deltaMs,
  }
}

export function scoreFromHit(result: HitResult): number {
  switch (result.grade) {
    case 'perfect':
      return 2
    case 'good':
      return 1
    default:
      return 0
  }
}

export function summarizeHits(hits: HitResult[]): ScoreSummary {
  const summary: ScoreSummary = {
    perfect: 0,
    good: 0,
    miss: 0,
    score: 0,
    maxScore: hits.length * 2,
    accuracy: 0,
  }

  for (const hit of hits) {
    if (hit.grade === 'perfect') {
      summary.perfect += 1
    } else if (hit.grade === 'good') {
      summary.good += 1
    } else {
      summary.miss += 1
    }

    summary.score += scoreFromHit(hit)
  }

  summary.accuracy = summary.maxScore === 0 ? 0 : summary.score / summary.maxScore
  return summary
}
