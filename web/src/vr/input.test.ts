import { describe, expect, it } from 'vitest'
import { canvasUvToClientPoint, dispatchPointerEvent } from './input'

describe('canvasUvToClientPoint', () => {
  it('translates uv to client coordinates based on canvas bounds', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 180
    canvas.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: 640,
      height: 360,
      right: 650,
      bottom: 380,
      x: 10,
      y: 20,
      toJSON: () => '',
    })

    const point = canvasUvToClientPoint({ x: 0.5, y: 0.5 }, canvas)
    expect(point.clientX).toBeCloseTo(330, 3)
    expect(point.clientY).toBeCloseTo(200, 3)
  })
})

describe('dispatchPointerEvent', () => {
  it('dispatches pointer events with the mapped coordinates', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 100
    canvas.getBoundingClientRect = () => ({
      left: 5,
      top: 5,
      width: 400,
      height: 200,
      right: 405,
      bottom: 205,
      x: 5,
      y: 5,
      toJSON: () => '',
    })

    let received = { x: 0, y: 0 }
    let receivedSet = false
    canvas.addEventListener('pointerdown', (event) => {
      received = { x: event.clientX, y: event.clientY }
      receivedSet = true
    })

    dispatchPointerEvent(canvas, 'pointerdown', { x: 0.25, y: 0.75 })

    expect(receivedSet).toBe(true)
    expect(received.x).toBeCloseTo(105, 3)
    expect(received.y).toBeCloseTo(55, 3)
  })
})
