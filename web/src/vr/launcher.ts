import type { VrTheater, VrTheaterConfig } from './theater'

export type VrLauncherDependencies = {
  loadTheater?: () => Promise<{ createVrTheater: (config: VrTheaterConfig) => VrTheater | null }>
}

export type VrLauncher = {
  dispose: () => void
}

type ButtonState = {
  label: string
  disabled: boolean
}

const defaultButtonState: ButtonState = {
  label: 'Enter VR',
  disabled: false,
}

const unavailableButtonState: ButtonState = {
  label: 'VR unavailable',
  disabled: true,
}

const loadingButtonState: ButtonState = {
  label: 'Loading VR...',
  disabled: true,
}

export function installVrLauncher(
  config: VrTheaterConfig,
  deps: VrLauncherDependencies = {}
): VrLauncher | null {
  if (!config.canvas || !config.container) {
    return null
  }

  const buttonContainer = config.buttonContainer ?? document.body
  const button = document.createElement('button')
  button.type = 'button'
  button.classList.add('xr-button', 'xr-button--lazy')
  applyButtonState(button, loadingButtonState)
  buttonContainer.appendChild(button)

  let disposed = false
  let loading = false
  let theater: VrTheater | null = null

  const updateAvailability = async () => {
    const xr = getWebXR()
    if (!xr) {
      applyButtonState(button, unavailableButtonState)
      return
    }

    try {
      const supported = await xr.isSessionSupported('immersive-vr')
      if (supported) {
        applyButtonState(button, defaultButtonState)
      } else {
        applyButtonState(button, unavailableButtonState)
      }
    } catch {
      applyButtonState(button, unavailableButtonState)
    }
  }

  const loadTheater = deps.loadTheater ?? (() => import('./theater'))

  const handleClick = async () => {
    if (loading || button.disabled) {
      return
    }

    loading = true
    applyButtonState(button, loadingButtonState)

    try {
      const { createVrTheater } = await loadTheater()
      theater = createVrTheater({ ...config, buttonContainer })
      if (theater) {
        button.remove()
        return
      }
      applyButtonState(button, unavailableButtonState)
    } catch {
      applyButtonState(button, defaultButtonState)
    } finally {
      loading = false
    }
  }

  button.addEventListener('click', handleClick)
  void updateAvailability()

  return {
    dispose: () => {
      if (disposed) {
        return
      }
      disposed = true
      button.removeEventListener('click', handleClick)
      button.remove()
      theater?.dispose()
    },
  }
}

function applyButtonState(button: HTMLButtonElement, state: ButtonState): void {
  button.textContent = state.label
  button.disabled = state.disabled
}

function getWebXR(): XRSystem | null {
  if (typeof navigator !== 'object' || navigator === null || !('xr' in navigator)) {
    return null
  }
  const xr = (navigator as Navigator & { xr?: XRSystem | null }).xr ?? null
  if (!xr || typeof xr.isSessionSupported !== 'function') {
    return null
  }
  return xr
}
