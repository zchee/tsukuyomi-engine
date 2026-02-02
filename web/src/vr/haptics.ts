export type HapticActuator = {
  pulse: (value: number, duration: number) => Promise<boolean>
}

export function getHapticActuator(gamepad?: Gamepad | null): HapticActuator | null {
  if (!gamepad) {
    return null
  }

  if ('hapticActuators' in gamepad && Array.isArray(gamepad.hapticActuators)) {
    const [first] = gamepad.hapticActuators
    if (first) {
      return first as HapticActuator
    }
  }

  const vibration = (gamepad as { vibrationActuator?: HapticActuator }).vibrationActuator
  return vibration ?? null
}

export async function pulseHaptics(
  gamepad: Gamepad | null | undefined,
  intensity: number,
  durationMs: number
): Promise<boolean> {
  const actuator = getHapticActuator(gamepad)
  if (!actuator) {
    return false
  }

  const clampedIntensity = clamp(intensity, 0, 1)
  const duration = Math.max(durationMs, 0)

  try {
    await actuator.pulse(clampedIntensity, duration)
    return true
  } catch {
    return false
  }
}

export function getConnectedGamepads(): Gamepad[] {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return []
  }

  const gamepads = navigator.getGamepads()
  if (!gamepads) {
    return []
  }

  return Array.from(gamepads).filter((gamepad): gamepad is Gamepad => Boolean(gamepad))
}

export async function pulseConnectedGamepads(intensity: number, durationMs: number): Promise<number> {
  const gamepads = getConnectedGamepads()
  if (gamepads.length === 0) {
    return 0
  }

  const results = await Promise.all(
    gamepads.map((gamepad) => pulseHaptics(gamepad, intensity, durationMs))
  )

  return results.filter(Boolean).length
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}
