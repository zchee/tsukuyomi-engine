import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { chatEventName, chatReactions, type ChatClientMessage } from '../chat/chat'
import { createVrTheater } from './theater'

const makeRendererStub = () => {
  const domElement = document.createElement('canvas')
  let animationLoop: ((time: number) => void) | null = null
  const listeners = new Map<string, Set<EventListener>>()
  const controllers = [new THREE.Group(), new THREE.Group()]

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
    getController: (index: number) => controllers[index] ?? new THREE.Group(),
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
    controllers,
  }
}

const makeEventTargetStub = () => {
  const listeners = new Map<string, Set<EventListener>>()
  return {
    listeners,
    addEventListener: (type: string, listener: EventListener) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }
      listeners.get(type)?.add(listener)
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event))
      return true
    },
  }
}

describe('createVrTheater', () => {
  it('creates and disposes the vr theater elements', () => {
    const container = document.createElement('div')
    const buttonContainer = document.createElement('div')
    const canvas = document.createElement('canvas')
    const rendererStub = makeRendererStub()
    const eventTarget = makeEventTargetStub()

    const theater = createVrTheater(
      {
        canvas,
        container,
        gameWidth: 320,
        gameHeight: 180,
        buttonContainer,
        chatEventTarget: eventTarget as unknown as EventTarget,
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
    expect(eventTarget.listeners.get(chatEventName)?.size ?? 0).toBe(1)

    theater?.dispose()

    expect(container.querySelector('#xr-root')).toBeNull()
    expect(buttonContainer.querySelector('button')).toBeNull()
    expect(eventTarget.listeners.get(chatEventName)?.size ?? 0).toBe(0)
  })

  it('sends chat reactions on controller squeeze', () => {
    const container = document.createElement('div')
    const buttonContainer = document.createElement('div')
    const canvas = document.createElement('canvas')
    const rendererStub = makeRendererStub()
    const sent: ChatClientMessage[] = []

    const theater = createVrTheater(
      {
        canvas,
        container,
        gameWidth: 320,
        gameHeight: 180,
        buttonContainer,
        chatSend: (message) => sent.push(message),
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

    const controller = rendererStub.controllers[0]
    controller.dispatchEvent({ type: 'squeezestart', data: {} })

    expect(sent.length).toBe(1)
    expect(sent[0].body).toBe(chatReactions[0].body)

    theater?.dispose()
  })
})
