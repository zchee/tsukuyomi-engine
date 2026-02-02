export type ScreenDimensions = {
  width: number
  height: number
}

export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    return clamp(value, max, min)
  }

  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

export function computeScreenDimensions(
  aspect: number,
  height: number,
  maxWidth?: number
): ScreenDimensions {
  const safeAspect = aspect > 0 ? aspect : 1
  const safeHeight = height > 0 ? height : 1
  let width = safeHeight * safeAspect
  let adjustedHeight = safeHeight

  if (maxWidth && width > maxWidth) {
    width = maxWidth
    adjustedHeight = width / safeAspect
  }

  return { width, height: adjustedHeight }
}

export function mapUvToCanvas(
  uv: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const safeWidth = Math.max(canvasWidth, 1)
  const safeHeight = Math.max(canvasHeight, 1)
  const clampedX = clamp(uv.x, 0, 1)
  const clampedY = clamp(uv.y, 0, 1)
  const x = Math.round(clampedX * safeWidth)
  const y = Math.round((1 - clampedY) * safeHeight)

  return {
    x: clamp(x, 0, safeWidth),
    y: clamp(y, 0, safeHeight),
  }
}
