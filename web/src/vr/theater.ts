import * as THREE from 'three'
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js'
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js'
import {
  chatEventName,
  chatReactions,
  type ChatClientMessage,
  type ChatEvent,
  type ChatPresence,
} from '../chat/chat'
import { createAudienceRing } from './audience'
import { createChatTicker } from './ticker'
import { computeScreenDimensions } from './geometry'
import { dispatchPointerEvent } from './input'
import { pulseHaptics } from './haptics'

export type VrTheaterConfig = {
  canvas: HTMLCanvasElement
  container: HTMLElement
  gameWidth: number
  gameHeight: number
  buttonContainer?: HTMLElement
  chatEventTarget?: EventTarget
  chatSend?: (message: ChatClientMessage) => void
}

export type VrTheaterDependencies = {
  rendererFactory?: () => THREE.WebGLRenderer
  vrButtonFactory?: (renderer: THREE.WebGLRenderer) => HTMLElement
}

export type VrTheater = {
  dispose: () => void
}

export function createVrTheater(
  config: VrTheaterConfig,
  deps: VrTheaterDependencies = {}
): VrTheater | null {
  if (!config.canvas || !config.container) {
    return null
  }

  const renderer = deps.rendererFactory?.() ?? new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.xr.enabled = true
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const xrRoot = document.createElement('div')
  xrRoot.id = 'xr-root'
  config.container.appendChild(xrRoot)

  renderer.domElement.classList.add('xr-canvas')
  xrRoot.appendChild(renderer.domElement)

  const buttonContainer = config.buttonContainer ?? document.body
  const vrButton = deps.vrButtonFactory
    ? deps.vrButtonFactory(renderer)
    : VRButton.createButton(renderer)
  vrButton.classList.add('xr-button')
  buttonContainer.appendChild(vrButton)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x02030a)
  scene.fog = new THREE.Fog(0x02030a, 3, 12)

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 50)
  camera.position.set(0, 1.6, 2.4)

  const starCount = 1200
  const starGeometry = new THREE.BufferGeometry()
  const starPositions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i += 1) {
    const radius = THREE.MathUtils.randFloat(4, 12)
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2)
    const phi = THREE.MathUtils.randFloat(0, Math.PI)
    starPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
    starPositions[i * 3 + 1] = Math.cos(phi) * radius
    starPositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
  })
  const stars = new THREE.Points(starGeometry, starMaterial)
  scene.add(stars)

  const nebulaMaterial = new THREE.MeshBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.22,
    side: THREE.BackSide,
  })
  const nebula = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 32), nebulaMaterial)
  scene.add(nebula)

  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xf2d77c })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), moonMaterial)
  moon.position.set(-1.4, 1.8, -3.4)
  scene.add(moon)

  const aspect = config.gameWidth / config.gameHeight
  const { width: screenWidth, height: screenHeight } = computeScreenDimensions(aspect, 1.2, 2.2)

  const screenTexture = new THREE.CanvasTexture(config.canvas)
  screenTexture.colorSpace = THREE.SRGBColorSpace
  screenTexture.minFilter = THREE.LinearFilter
  screenTexture.magFilter = THREE.LinearFilter

  const screenGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight)
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial)
  screenMesh.position.set(0, 1.4, -2.4)
  screenMesh.rotation.x = -0.03
  scene.add(screenMesh)

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x243142,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  })
  const glowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(screenWidth * 1.08, screenHeight * 1.08),
    glowMaterial
  )
  glowMesh.position.copy(screenMesh.position)
  glowMesh.position.z -= 0.02
  glowMesh.rotation.copy(screenMesh.rotation)
  scene.add(glowMesh)

  const frameMaterial = new THREE.LineBasicMaterial({
    color: 0x7cf2b4,
    transparent: true,
    opacity: 0.55,
  })
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(screenGeometry), frameMaterial)
  frame.position.copy(screenMesh.position)
  frame.rotation.copy(screenMesh.rotation)
  scene.add(frame)

  const ticker = createChatTicker({
    width: screenWidth * 1.1,
    height: screenHeight * 0.22,
  })
  ticker.mesh.position.set(0, 0.8, -2.3)
  ticker.mesh.rotation.copy(screenMesh.rotation)
  scene.add(ticker.mesh)

  const audience = createAudienceRing({ radius: 1.7 })
  audience.group.position.set(0, 1.05, -2.2)
  scene.add(audience.group)

  const reticleMaterial = new THREE.MeshBasicMaterial({
    color: 0x7cf2b4,
    transparent: true,
    opacity: 0.85,
  })
  const reticle = new THREE.Mesh(new THREE.CircleGeometry(0.02, 32), reticleMaterial)
  reticle.visible = false
  scene.add(reticle)

  const raycaster = new THREE.Raycaster()
  const tempMatrix = new THREE.Matrix4()
  let reactionIndex = 0
  let lastReactionAt = 0
  const reactionCooldownMs = 250
  const controllerLines: Array<{
    controller: XRController
    line: THREE.Line
    onSelectStart: (event: XRSelectEvent) => void
    onSelectEnd: (event: XRSelectEvent) => void
    onSqueezeStart: (event: XRSelectEvent) => void
  }> = []

  const controllerGrips: THREE.Group[] = []
  const canUseControllerModels = typeof navigator !== 'undefined' && 'xr' in navigator
  const controllerModelFactory = canUseControllerModels ? new XRControllerModelFactory() : null

  type XRController = THREE.Group & {
    addEventListener: (
      type: 'selectstart' | 'selectend' | 'squeezestart',
      listener: (event: XRSelectEvent) => void
    ) => void
    removeEventListener: (
      type: 'selectstart' | 'selectend' | 'squeezestart',
      listener: (event: XRSelectEvent) => void
    ) => void
  }

  type XRSelectEvent = {
    data?: XRInputSource
  }

  const controllerRayMaterial = new THREE.LineBasicMaterial({ color: 0x7cf2b4 })
  for (let i = 0; i < 2; i += 1) {
    const controller = renderer.xr.getController(i) as XRController
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ])
    const line = new THREE.Line(lineGeometry, controllerRayMaterial)
    line.name = 'ray'
    line.scale.z = 4
    controller.add(line)

    const onSelectStart = (event: XRSelectEvent) => {
      const hit = getControllerIntersection(controller)
      if (hit?.uv) {
        dispatchPointerEvent(config.canvas, 'pointerdown', hit.uv)
      }
      void pulseHaptics(event.data?.gamepad, 0.6, 40)
    }

    const onSelectEnd = (event: XRSelectEvent) => {
      const hit = getControllerIntersection(controller)
      if (hit?.uv) {
        dispatchPointerEvent(config.canvas, 'pointerup', hit.uv)
      }
      void pulseHaptics(event.data?.gamepad, 0.2, 20)
    }

    const onSqueezeStart = (event: XRSelectEvent) => {
      if (!config.chatSend || chatReactions.length === 0) {
        return
      }
      const now =
        typeof performance === 'object' && performance && typeof performance.now === 'function'
          ? performance.now()
          : Date.now()
      if (now - lastReactionAt < reactionCooldownMs) {
        return
      }
      lastReactionAt = now
      const reaction = chatReactions[reactionIndex % chatReactions.length]
      reactionIndex += 1
      config.chatSend({ type: 'chat', body: reaction.body })
      void pulseHaptics(event.data?.gamepad, 0.4, 30)
    }

    controller.addEventListener('selectstart', onSelectStart)
    controller.addEventListener('selectend', onSelectEnd)
    controller.addEventListener('squeezestart', onSqueezeStart)

    scene.add(controller)
    controllerLines.push({ controller, line, onSelectStart, onSelectEnd, onSqueezeStart })

    if (controllerModelFactory) {
      const grip = renderer.xr.getControllerGrip(i)
      grip.add(controllerModelFactory.createControllerModel(grip))
      scene.add(grip)
      controllerGrips.push(grip)
    }
  }

  const audienceUsers = new Map<string, ChatPresence>()
  const chatEventTarget =
    config.chatEventTarget ?? (typeof window === 'object' ? (window as unknown as EventTarget) : null)

  const syncAudience = () => {
    audience.updateUsers([...audienceUsers.values()])
  }

  const onChatEvent = (event: Event) => {
    const detail = (event as CustomEvent<ChatEvent>).detail
    if (!detail) {
      return
    }
    if (detail.type === 'welcome') {
      audienceUsers.clear()
      detail.users?.forEach((user) => audienceUsers.set(user.id, user))
      syncAudience()
      if (detail.from?.name) {
        ticker.addMessage(`Connected as ${detail.from.name}`)
      } else {
        ticker.addMessage('Connected to chat')
      }
      return
    }
    if (detail.type === 'presence' && detail.from) {
      if (detail.action === 'join' || detail.action === 'rename') {
        audienceUsers.set(detail.from.id, detail.from)
      }
      if (detail.action === 'leave') {
        audienceUsers.delete(detail.from.id)
      }
      syncAudience()
      if (detail.action === 'join') {
        ticker.addMessage(`${detail.from.name} joined`)
      }
      if (detail.action === 'leave') {
        ticker.addMessage(`${detail.from.name} left`)
      }
      if (detail.action === 'rename') {
        const previous = detail.body ?? 'Someone'
        ticker.addMessage(`${previous} is now ${detail.from.name}`)
      }
      return
    }
    if (detail.type === 'chat' && detail.from) {
      const now =
        typeof performance === 'object' && performance && typeof performance.now === 'function'
          ? performance.now()
          : Date.now()
      audience.pulse(detail.from.id, now)
      ticker.addMessage(`${detail.from.name}: ${detail.body ?? ''}`.trim())
    }
  }

  if (chatEventTarget) {
    chatEventTarget.addEventListener(chatEventName, onChatEvent as EventListener)
  }

  const resize = () => {
    const rect = config.container.getBoundingClientRect()
    const width = Math.max(rect.width, 1)
    const height = Math.max(rect.height, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  const renderFrame = () => {
    screenTexture.needsUpdate = true
    stars.rotation.y += 0.0005
    stars.rotation.x += 0.0002
    const now =
      typeof performance === 'object' && performance && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()
    audience.tick(now)

    let activeHit: THREE.Intersection | null = null
    for (const { controller, line } of controllerLines) {
      const hit = getControllerIntersection(controller)
      if (hit) {
        line.scale.z = hit.distance
        activeHit ??= hit
      } else {
        line.scale.z = 4
      }
    }

    if (activeHit?.uv) {
      reticle.visible = true
      reticle.position.copy(activeHit.point)
      reticle.quaternion.copy(screenMesh.quaternion)
      dispatchPointerEvent(config.canvas, 'pointermove', activeHit.uv)
    } else {
      reticle.visible = false
    }

    renderer.render(scene, camera)
  }

  const onSessionStart = () => {
    document.body.classList.add('xr-active')
    xrRoot.classList.add('xr-active')
    renderer.setAnimationLoop(renderFrame)
  }

  const onSessionEnd = () => {
    document.body.classList.remove('xr-active')
    xrRoot.classList.remove('xr-active')
    renderer.setAnimationLoop(null)
    reticle.visible = false
  }

  const getControllerIntersection = (controller: XRController): THREE.Intersection | null => {
    tempMatrix.identity().extractRotation(controller.matrixWorld)
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)
    const intersections = raycaster.intersectObject(screenMesh)
    if (intersections.length === 0) {
      return null
    }
    return intersections[0]
  }

  renderer.xr.addEventListener('sessionstart', onSessionStart)
  renderer.xr.addEventListener('sessionend', onSessionEnd)

  renderer.setAnimationLoop(null)
  resize()
  window.addEventListener('resize', resize)

  let disposed = false
  const dispose = () => {
    if (disposed) {
      return
    }
    disposed = true

    renderer.setAnimationLoop(null)
    renderer.xr.removeEventListener('sessionstart', onSessionStart)
    renderer.xr.removeEventListener('sessionend', onSessionEnd)
    window.removeEventListener('resize', resize)
    if (chatEventTarget) {
      chatEventTarget.removeEventListener(chatEventName, onChatEvent as EventListener)
    }

    for (const { controller, line, onSelectStart, onSelectEnd, onSqueezeStart } of controllerLines) {
      controller.removeEventListener('selectstart', onSelectStart)
      controller.removeEventListener('selectend', onSelectEnd)
      controller.removeEventListener('squeezestart', onSqueezeStart)
      line.geometry.dispose()
    }
    controllerRayMaterial.dispose()
    for (const grip of controllerGrips) {
      grip.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      grip.removeFromParent()
    }

    screenTexture.dispose()
    screenGeometry.dispose()
    screenMaterial.dispose()
    glowMesh.geometry.dispose()
    glowMaterial.dispose()
    frame.geometry.dispose()
    frameMaterial.dispose()
    ticker.dispose()
    ticker.mesh.removeFromParent()
    audience.dispose()
    audience.group.removeFromParent()
    starGeometry.dispose()
    starMaterial.dispose()
    nebula.geometry.dispose()
    nebulaMaterial.dispose()
    moon.geometry.dispose()
    moonMaterial.dispose()
    reticle.geometry.dispose()
    reticleMaterial.dispose()
    renderer.dispose()

    xrRoot.remove()
    vrButton.remove()
    document.body.classList.remove('xr-active')
  }

  return { dispose }
}
