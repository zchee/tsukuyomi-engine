import * as THREE from 'three'

export type AudiencePresence = {
  id: string
  name: string
}

export type AudienceRingConfig = {
  radius?: number
  height?: number
  nameplateWidth?: number
  nameplateHeight?: number
  nameplateOffset?: number
  nameplatePixelWidth?: number
  nameplatePixelHeight?: number
  nameplateMaxChars?: number
}

export type AudienceRing = {
  group: THREE.Group
  updateUsers: (users: AudiencePresence[]) => void
  pulse: (id: string, now?: number) => void
  tick: (now: number) => void
  dispose: () => void
}

const defaultRadius = 1.65
const defaultHeight = 0
const defaultNameplateWidth = 0.55
const defaultNameplateHeight = 0.14
const defaultNameplateOffset = 0.18
const defaultNameplatePixelWidth = 256
const defaultNameplatePixelHeight = 64
const defaultNameplateMaxChars = 16
const pulseDurationMs = 350
const pulseScale = 1.35

type audienceMember = {
  mesh: THREE.Mesh
  label: THREE.Sprite
  labelTexture: THREE.Texture
  labelMaterial: THREE.SpriteMaterial
  labelCanvas: HTMLCanvasElement
  labelContext: CanvasRenderingContext2D | null
}

export function createAudienceRing(config: AudienceRingConfig = {}): AudienceRing {
  const radius = config.radius ?? defaultRadius
  const group = new THREE.Group()
  group.position.y = config.height ?? defaultHeight

  const geometry = new THREE.SphereGeometry(0.085, 16, 16)
  const members = new Map<string, audienceMember>()
  const pulses = new Map<string, number>()
  const nameplateWidth = config.nameplateWidth ?? defaultNameplateWidth
  const nameplateHeight = config.nameplateHeight ?? defaultNameplateHeight
  const nameplateOffset = config.nameplateOffset ?? defaultNameplateOffset
  const nameplatePixelWidth = config.nameplatePixelWidth ?? defaultNameplatePixelWidth
  const nameplatePixelHeight = config.nameplatePixelHeight ?? defaultNameplatePixelHeight
  const nameplateMaxChars = config.nameplateMaxChars ?? defaultNameplateMaxChars

  const updateUsers = (users: AudiencePresence[]) => {
    const sorted = [...users].sort((a, b) => a.id.localeCompare(b.id))
    const seen = new Set(sorted.map((user) => user.id))

    for (const [id, member] of members) {
      if (!seen.has(id)) {
        group.remove(member.mesh)
        disposeMember(member)
        members.delete(id)
        pulses.delete(id)
      }
    }

    for (const user of sorted) {
      const existing = members.get(user.id)
      if (!existing) {
        const material = new THREE.MeshBasicMaterial({ color: colorFromID(user.id) })
        const mesh = new THREE.Mesh(geometry.clone(), material)
        mesh.name = user.id
        const name = normalizeLabel(user.name, nameplateMaxChars)
        const nameplate = createNameplate(
          name,
          nameplateWidth,
          nameplateHeight,
          nameplatePixelWidth,
          nameplatePixelHeight
        )
        nameplate.sprite.position.set(0, nameplateOffset, 0)
        nameplate.sprite.name = `${user.id}-label`
        nameplate.sprite.userData.text = name
        mesh.add(nameplate.sprite)
        members.set(user.id, {
          mesh,
          label: nameplate.sprite,
          labelTexture: nameplate.texture,
          labelMaterial: nameplate.material,
          labelCanvas: nameplate.canvas,
          labelContext: nameplate.context,
        })
        group.add(mesh)
        continue
      }

      updateMemberLabel(
        existing,
        normalizeLabel(user.name, nameplateMaxChars),
        nameplatePixelWidth,
        nameplatePixelHeight
      )
    }

    positionMembers(
      [...members.values()].map((member) => member.mesh),
      radius
    )
  }

  const pulse = (id: string, now: number = safeNow()) => {
    const member = members.get(id)
    if (!member) {
      return
    }
    member.mesh.scale.setScalar(pulseScale)
    pulses.set(id, now + pulseDurationMs)
  }

  const tick = (now: number) => {
    for (const [id, until] of pulses) {
      if (now >= until) {
        const member = members.get(id)
        if (member) {
          member.mesh.scale.setScalar(1)
        }
        pulses.delete(id)
      }
    }
  }

  const dispose = () => {
    for (const member of members.values()) {
      disposeMember(member)
    }
    geometry.dispose()
    members.clear()
    pulses.clear()
    group.clear()
  }

  return {
    group,
    updateUsers,
    pulse,
    tick,
    dispose,
  }
}

function createNameplate(
  text: string,
  width: number,
  height: number,
  pixelWidth: number,
  pixelHeight: number
): {
  sprite: THREE.Sprite
  texture: THREE.Texture
  material: THREE.SpriteMaterial
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D | null
} {
  const canvas = document.createElement('canvas')
  canvas.width = pixelWidth
  canvas.height = pixelHeight
  const context = canvas.getContext('2d')
  if (context) {
    drawNameplate(context, canvas, text)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width, height, 1)
  sprite.center.set(0.5, 0)

  return { sprite, texture, material, canvas, context }
}

function updateMemberLabel(
  member: audienceMember,
  text: string,
  pixelWidth: number,
  pixelHeight: number
): void {
  if (member.label.userData.text === text) {
    return
  }
  member.label.userData.text = text
  member.labelCanvas.width = pixelWidth
  member.labelCanvas.height = pixelHeight
  if (member.labelContext) {
    drawNameplate(member.labelContext, member.labelCanvas, text)
  }
  member.labelTexture.needsUpdate = true
}

function drawNameplate(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string
): void {
  const width = canvas.width
  const height = canvas.height
  context.clearRect(0, 0, width, height)
  context.globalAlpha = 0.9
  context.fillStyle = 'rgba(7, 10, 14, 0.85)'
  context.fillRect(0, 0, width, height)
  context.globalAlpha = 0.8
  context.strokeStyle = 'rgba(124, 242, 180, 0.6)'
  context.lineWidth = 2
  context.strokeRect(1, 1, width - 2, height - 2)

  context.globalAlpha = 1
  context.font = "16px 'DotGothic16', monospace"
  context.fillStyle = '#e8f0ff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text || 'Guest', width / 2, height / 2)
}

function normalizeLabel(raw: string, maxChars: number): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return 'Guest'
  }
  const collapsed = trimmed.replace(/\s+/g, ' ')
  if (maxChars <= 0 || collapsed.length <= maxChars) {
    return collapsed
  }
  return collapsed.slice(0, maxChars)
}

function disposeMember(member: audienceMember): void {
  member.mesh.remove(member.label)
  member.labelMaterial.dispose()
  member.labelTexture.dispose()
  member.mesh.geometry.dispose()
  if (Array.isArray(member.mesh.material)) {
    member.mesh.material.forEach((material) => material.dispose())
  } else {
    member.mesh.material.dispose()
  }
}

function positionMembers(members: THREE.Object3D[], radius: number): void {
  const count = members.length
  if (count === 0) {
    return
  }

  const step = (Math.PI * 2) / count
  const start = -Math.PI / 2

  members.forEach((member, index) => {
    const angle = start + step * index
    member.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
  })
}

function colorFromID(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 360
  }
  const color = new THREE.Color()
  color.setHSL(hash / 360, 0.55, 0.6)
  return color.getHex()
}

function safeNow(): number {
  if (typeof performance === 'object' && performance && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}
