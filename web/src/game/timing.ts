export function countdownLabel(currentMs: number): string | null {
  if (currentMs >= 0) {
    return null
  }

  const seconds = Math.ceil(Math.abs(currentMs) / 1000)
  return `Starts in ${seconds}`
}
