export function appendHistory(history: string[], line: string, maxLines: number): string[] {
  if (line.trim().length === 0 || maxLines <= 0) {
    return history
  }

  const next = [...history, line]
  if (next.length <= maxLines) {
    return next
  }

  return next.slice(next.length - maxLines)
}
