import * as THREE from 'three'

export type ChatTickerConfig = {
  width?: number
  height?: number
  pixelWidth?: number
  pixelHeight?: number
  maxLines?: number
  maxChars?: number
  font?: string
  lineHeight?: number
}

export type ChatTickerDependencies = {
  createCanvas?: () => HTMLCanvasElement
  getContext?: (canvas: HTMLCanvasElement) => CanvasRenderingContext2D | null
  createTexture?: (canvas: HTMLCanvasElement) => THREE.Texture
}

export type ChatTicker = {
  mesh: THREE.Mesh
  addMessage: (message: string) => void
  clear: () => void
  getLines: () => string[]
  dispose: () => void
}

const defaultWidth = 1.7
const defaultHeight = 0.28
const defaultPixelWidth = 640
const defaultPixelHeight = 200
const defaultMaxLines = 5
const defaultMaxChars = 80
const defaultLineHeight = 20

export function createChatTicker(
  config: ChatTickerConfig = {},
  deps: ChatTickerDependencies = {}
): ChatTicker {
  const canvas = deps.createCanvas?.() ?? document.createElement('canvas')
  canvas.width = config.pixelWidth ?? defaultPixelWidth
  canvas.height = config.pixelHeight ?? defaultPixelHeight

  const context =
    deps.getContext?.(canvas) ?? canvas.getContext('2d') ?? createNullContext()

  const texture = deps.createTexture?.(canvas) ?? new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  const geometry = new THREE.PlaneGeometry(
    config.width ?? defaultWidth,
    config.height ?? defaultHeight
  )
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)

  const maxLines = config.maxLines ?? defaultMaxLines
  const maxChars = config.maxChars ?? defaultMaxChars
  const lineHeight = config.lineHeight ?? defaultLineHeight
  const lines: string[] = []

  const render = () => {
    const width = canvas.width
    const height = canvas.height
    const padding = 12

    context.clearRect(0, 0, width, height)
    context.globalAlpha = 0.85
    context.fillStyle = 'rgba(7, 10, 14, 0.85)'
    context.fillRect(0, 0, width, height)

    context.globalAlpha = 0.9
    context.strokeStyle = 'rgba(124, 242, 180, 0.6)'
    context.lineWidth = 2
    context.strokeRect(1, 1, width - 2, height - 2)

    context.globalAlpha = 1
    context.font = config.font ?? "16px 'DotGothic16', monospace"
    context.fillStyle = '#e8f0ff'
    context.textAlign = 'left'
    context.textBaseline = 'top'

    const totalHeight = Math.max(lines.length, 1) * lineHeight
    const startY = Math.max(padding, height - padding - totalHeight)

    lines.forEach((line, index) => {
      context.fillText(line, padding, startY + index * lineHeight)
    })

    texture.needsUpdate = true
  }

  const addMessage = (message: string) => {
    const normalized = normalizeTickerText(message, maxChars)
    if (!normalized) {
      return
    }
    lines.push(normalized)
    if (lines.length > maxLines) {
      lines.splice(0, lines.length - maxLines)
    }
    render()
  }

  const clear = () => {
    lines.splice(0, lines.length)
    render()
  }

  render()

  return {
    mesh,
    addMessage,
    clear,
    getLines: () => [...lines],
    dispose: () => {
      geometry.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

function normalizeTickerText(raw: string, maxChars: number): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  const collapsed = trimmed.replace(/\s+/g, ' ')
  if (maxChars <= 0) {
    return collapsed
  }
  if (collapsed.length <= maxChars) {
    return collapsed
  }
  return collapsed.slice(0, maxChars)
}

function createNullContext(): CanvasRenderingContext2D {
  const noop = () => undefined
  const makeImageData = () => {
    if (typeof ImageData === 'function') {
      return new ImageData(1, 1)
    }
    return { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData
  }
  return {
    canvas: document.createElement('canvas'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    fillText: noop,
    measureText: () => ({ width: 0 } as TextMetrics),
    save: noop,
    restore: noop,
    scale: noop,
    rotate: noop,
    translate: noop,
    transform: noop,
    setTransform: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    rect: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    drawImage: noop,
    createImageData: () => makeImageData(),
    createPattern: () => null,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: () => makeImageData(),
    putImageData: noop,
    setLineDash: noop,
    getLineDash: () => [],
    fillRule: 'nonzero',
  } as CanvasRenderingContext2D
}
