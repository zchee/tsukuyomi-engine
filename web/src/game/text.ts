export function advanceReveal(
  visibleChars: number,
  deltaMs: number,
  charsPerSecond: number,
  totalChars: number
): number {
  if (totalChars <= 0) {
    return 0
  }

  const next = visibleChars + (deltaMs / 1000) * charsPerSecond
  return Math.min(next, totalChars)
}

export function charsPerSecondFromSpeed(speed: 'slow' | 'normal' | 'fast'): number {
  if (speed === 'slow') {
    return 24
  }
  if (speed === 'fast') {
    return 60
  }
  return 40
}
