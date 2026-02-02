import { mapUvToCanvas } from './geometry'

export type ClientPoint = {
  clientX: number
  clientY: number
}

export function canvasUvToClientPoint(
  uv: { x: number; y: number },
  canvas: HTMLCanvasElement
): ClientPoint {
  const { x, y } = mapUvToCanvas(uv, canvas.width, canvas.height)
  const rect = canvas.getBoundingClientRect()
  const safeWidth = Math.max(canvas.width, 1)
  const safeHeight = Math.max(canvas.height, 1)
  const clientX = rect.left + (x / safeWidth) * rect.width
  const clientY = rect.top + (y / safeHeight) * rect.height

  return { clientX, clientY }
}

export function dispatchPointerEvent(
  canvas: HTMLCanvasElement,
  type: 'pointerdown' | 'pointerup' | 'pointermove',
  uv: { x: number; y: number },
  pointerId = 1
): void {
  const { clientX, clientY } = canvasUvToClientPoint(uv, canvas)
  const EventCtor = window.PointerEvent ?? window.MouseEvent
  const init: PointerEventInit = {
    clientX,
    clientY,
    pointerId,
    pointerType: 'xr',
    isPrimary: pointerId === 1,
    bubbles: true,
  }

  const event = new EventCtor(type, init as MouseEventInit)
  canvas.dispatchEvent(event)
}
