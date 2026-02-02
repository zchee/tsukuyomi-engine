import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createChatTicker } from './ticker'

const makeContext = () => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 } as TextMetrics)),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'top' as CanvasTextBaseline,
  globalAlpha: 1,
})

describe('createChatTicker', () => {
  it('stores messages and clamps to max lines', () => {
    const canvas = document.createElement('canvas')
    const context = makeContext()

    const ticker = createChatTicker(
      { maxLines: 2, maxChars: 50 },
      {
        createCanvas: () => canvas,
        getContext: () => context as unknown as CanvasRenderingContext2D,
        createTexture: () => new THREE.Texture(),
      }
    )

    ticker.addMessage('first')
    ticker.addMessage('second')
    ticker.addMessage('third')

    expect(ticker.getLines()).toEqual(['second', 'third'])

    ticker.dispose()
  })

  it('normalizes whitespace and truncates long lines', () => {
    const canvas = document.createElement('canvas')
    const context = makeContext()

    const ticker = createChatTicker(
      { maxLines: 3, maxChars: 5 },
      {
        createCanvas: () => canvas,
        getContext: () => context as unknown as CanvasRenderingContext2D,
        createTexture: () => new THREE.Texture(),
      }
    )

    ticker.addMessage('  hello   world  ')

    expect(ticker.getLines()).toEqual(['hello'])

    ticker.dispose()
  })

  it('clears messages', () => {
    const canvas = document.createElement('canvas')
    const context = makeContext()

    const ticker = createChatTicker(
      { maxLines: 3 },
      {
        createCanvas: () => canvas,
        getContext: () => context as unknown as CanvasRenderingContext2D,
        createTexture: () => new THREE.Texture(),
      }
    )

    ticker.addMessage('hello')
    ticker.clear()

    expect(ticker.getLines()).toEqual([])

    ticker.dispose()
  })
})
