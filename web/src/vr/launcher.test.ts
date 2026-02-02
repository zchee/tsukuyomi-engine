import { describe, expect, it, vi } from 'vitest'
import { installVrLauncher } from './launcher'

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const originalXrDescriptor = Object.getOwnPropertyDescriptor(navigator, 'xr')

const setXr = (value?: XRSystem) => {
  Object.defineProperty(navigator, 'xr', {
    value,
    configurable: true,
  })
}

const restoreXr = () => {
  if (originalXrDescriptor) {
    Object.defineProperty(navigator, 'xr', originalXrDescriptor)
    return
  }

  Object.defineProperty(navigator, 'xr', {
    value: undefined,
    configurable: true,
  })
}

describe('installVrLauncher', () => {
  it('returns null when required elements are missing', () => {
    const launcher = installVrLauncher({
      canvas: null as unknown as HTMLCanvasElement,
      container: document.body,
      gameWidth: 320,
      gameHeight: 180,
    })

    expect(launcher).toBeNull()
  })

  it('disables the button when WebXR is unavailable', async () => {
    setXr(undefined)

    const canvas = document.createElement('canvas')
    const launcher = installVrLauncher({
      canvas,
      container: document.body,
      gameWidth: 320,
      gameHeight: 180,
    })

    await flushPromises()

    const button = document.querySelector('button.xr-button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.textContent).toBe('VR unavailable')

    launcher?.dispose()
    restoreXr()
  })

  it('enables the button when WebXR is supported', async () => {
    const isSessionSupported = vi.fn().mockResolvedValue(true)
    setXr({ isSessionSupported } as unknown as XRSystem)

    const canvas = document.createElement('canvas')
    const launcher = installVrLauncher({
      canvas,
      container: document.body,
      gameWidth: 320,
      gameHeight: 180,
    })

    await flushPromises()

    const button = document.querySelector('button.xr-button') as HTMLButtonElement
    expect(button.disabled).toBe(false)
    expect(button.textContent).toBe('Enter VR')

    launcher?.dispose()
    restoreXr()
  })

  it('loads the VR theater on click', async () => {
    const isSessionSupported = vi.fn().mockResolvedValue(true)
    setXr({ isSessionSupported } as unknown as XRSystem)

    const canvas = document.createElement('canvas')
    const createVrTheater = vi.fn().mockReturnValue({ dispose: vi.fn() })
    const loadTheater = vi.fn().mockResolvedValue({ createVrTheater })

    const launcher = installVrLauncher(
      {
        canvas,
        container: document.body,
        gameWidth: 320,
        gameHeight: 180,
      },
      { loadTheater }
    )

    await flushPromises()

    const button = document.querySelector('button.xr-button') as HTMLButtonElement
    button.click()

    await flushPromises()

    expect(loadTheater).toHaveBeenCalled()
    expect(createVrTheater).toHaveBeenCalled()
    expect(document.querySelector('button.xr-button')).toBeNull()

    launcher?.dispose()
    restoreXr()
  })
})
