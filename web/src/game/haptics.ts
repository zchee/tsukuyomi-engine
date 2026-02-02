import type { HitGrade } from './types'
import { pulseConnectedGamepads } from '../vr/haptics'

export type HitHapticProfile = {
  intensity: number
  durationMs: number
}

export function hapticProfileForGrade(grade: HitGrade): HitHapticProfile {
  switch (grade) {
    case 'perfect':
      return { intensity: 0.9, durationMs: 45 }
    case 'good':
      return { intensity: 0.6, durationMs: 30 }
    case 'miss':
      return { intensity: 0.25, durationMs: 20 }
  }
}

export function triggerHitHaptics(grade: HitGrade): Promise<number> {
  const profile = hapticProfileForGrade(grade)
  return pulseConnectedGamepads(profile.intensity, profile.durationMs)
}
