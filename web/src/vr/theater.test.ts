import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createVrTheater } from './theater'

const makeRendererStub = () => {
  const domElement = document.createElement('canvas')
  let animationLoop: ((time: number) => void) | null = null
  const listeners = new Map<string, Set<EventListener>>()

  const xr = {
    enabled: false,
    addEventListener: (type: string, listener: EventListener) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type)?.add(listener)
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    },
    getController: () => new THREE.Group(),
  }

  return {
    domElement,
    xr,
    setPixelRatio: () => undefined,
    setSize: () => undefined,
    setAnimationLoop: (callback: ((time: number) => void) | null) => {
      animationLoop = callback
    },
    render: () => undefined,
    dispose: () => undefined,
    getAnimationLoop: () => animationLoop,
  }
}

describe('createVrTheater', () => {
  it('creates and disposes the vr theater elements', () => {
    const container = document.createElement('div')
    const buttonContainer = document.createElement('div')
    const canvas = document.createElement('canvas')
    const rendererStub = makeRendererStub()

    const theater = createVrTheater(
      {
        canvas,
        container,
        gameWidth: 320,
        gameHeight: 180,
        buttonContainer,
      },
      {
        rendererFactory: () => rendererStub as unknown as THREE.WebGLRenderer,
        vrButtonFactory: () => {
          const button = document.createElement('button')
          button.textContent = 'Enter VR'
          return button
        },
      }
    )

    expect(theater).not.toBeNull()
    expect(container.querySelector('#xr-root')).not.toBeNull()
    expect(buttonContainer.querySelector('button')).not.toBeNull()
    expect(rendererStub.xr.enabled).toBe(true)

    theater?.dispose()

    expect(container.querySelector('#xr-root')).toBeNull()
    expect(buttonContainer.querySelector('button')).toBeNull()
  })
})
