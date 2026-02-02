import { describe, expect, it, vi } from 'vitest'
import { hapticProfileForGrade, triggerHitHaptics } from './haptics'

const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads')

const setGetGamepads = (value?: () => (Gamepad | null)[]) => {
  Object.defineProperty(navigator, 'getGamepads', {
    value,
    configurable: true,
  })
}

const restoreGetGamepads = () => {
  if (originalDescriptor) {
    Object.defineProperty(navigator, 'getGamepads', originalDescriptor)
    return
  }
  Object.defineProperty(navigator, 'getGamepads', {
    value: undefined,
    configurable: true,
  })
}

describe('hapticProfileForGrade', () => {
  it('returns a distinct profile for each grade', () => {
    expect(hapticProfileForGrade('perfect')).toEqual({ intensity: 0.9, durationMs: 45 })
    expect(hapticProfileForGrade('good')).toEqual({ intensity: 0.6, durationMs: 30 })
    expect(hapticProfileForGrade('miss')).toEqual({ intensity: 0.25, durationMs: 20 })
  })
})

describe('triggerHitHaptics', () => {
  it('pulses connected gamepads for the selected grade', async () => {
    const actuator = { pulse: vi.fn().mockResolvedValue(true) }
    const pad = { hapticActuators: [actuator] } as unknown as Gamepad

    setGetGamepads(() => [pad])

    await expect(triggerHitHaptics('good')).resolves.toBe(1)
    expect(actuator.pulse).toHaveBeenCalledWith(0.6, 30)

    restoreGetGamepads()
  })

  it('returns zero when no gamepads are connected', async () => {
    setGetGamepads(() => [])
    await expect(triggerHitHaptics('miss')).resolves.toBe(0)
    restoreGetGamepads()
  })
})
