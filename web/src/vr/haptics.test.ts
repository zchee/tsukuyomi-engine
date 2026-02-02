import { describe, expect, it, vi } from 'vitest'
import { getConnectedGamepads, getHapticActuator, pulseConnectedGamepads, pulseHaptics } from './haptics'

const makeActuator = () => ({
  pulse: vi.fn().mockResolvedValue(true),
})

describe('getHapticActuator', () => {
  it('returns null when no gamepad is provided', () => {
    expect(getHapticActuator(null)).toBeNull()
    expect(getHapticActuator(undefined)).toBeNull()
  })

  it('returns the first haptic actuator when available', () => {
    const actuator = makeActuator()
    const gamepad = { hapticActuators: [actuator] } as unknown as Gamepad

    expect(getHapticActuator(gamepad)).toBe(actuator)
  })

  it('falls back to vibrationActuator when provided', () => {
    const actuator = makeActuator()
    const gamepad = { vibrationActuator: actuator } as unknown as Gamepad

    expect(getHapticActuator(gamepad)).toBe(actuator)
  })
})

describe('pulseHaptics', () => {
  it('returns false when no actuator is available', async () => {
    await expect(pulseHaptics(null, 1, 50)).resolves.toBe(false)
  })

  it('clamps intensity and pulses the actuator', async () => {
    const actuator = makeActuator()
    const gamepad = { hapticActuators: [actuator] } as unknown as Gamepad

    await expect(pulseHaptics(gamepad, 2, 50)).resolves.toBe(true)
    expect(actuator.pulse).toHaveBeenCalledWith(1, 50)
  })

  it('handles actuator errors gracefully', async () => {
    const actuator = { pulse: vi.fn().mockRejectedValue(new Error('fail')) }
    const gamepad = { hapticActuators: [actuator] } as unknown as Gamepad

    await expect(pulseHaptics(gamepad, 0.5, 40)).resolves.toBe(false)
  })
})

describe('getConnectedGamepads', () => {
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

  it('returns an empty list when getGamepads is unavailable', () => {
    setGetGamepads(undefined)
    expect(getConnectedGamepads()).toEqual([])
    restoreGetGamepads()
  })

  it('filters out null gamepads', () => {
    const pad = { hapticActuators: [] } as unknown as Gamepad
    setGetGamepads(() => [pad, null])
    expect(getConnectedGamepads()).toEqual([pad])
    restoreGetGamepads()
  })
})

describe('pulseConnectedGamepads', () => {
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

  it('returns zero when no gamepads are connected', async () => {
    setGetGamepads(() => [])
    await expect(pulseConnectedGamepads(0.5, 20)).resolves.toBe(0)
    restoreGetGamepads()
  })

  it('pulses all connected gamepads with actuators', async () => {
    const actuatorOk = { pulse: vi.fn().mockResolvedValue(true) }
    const actuatorFail = { pulse: vi.fn().mockRejectedValue(new Error('fail')) }
    const padOk = { hapticActuators: [actuatorOk] } as unknown as Gamepad
    const padFail = { hapticActuators: [actuatorFail] } as unknown as Gamepad

    setGetGamepads(() => [padOk, padFail])

    await expect(pulseConnectedGamepads(0.7, 30)).resolves.toBe(1)
    expect(actuatorOk.pulse).toHaveBeenCalledWith(0.7, 30)
    expect(actuatorFail.pulse).toHaveBeenCalledWith(0.7, 30)

    restoreGetGamepads()
  })
})
