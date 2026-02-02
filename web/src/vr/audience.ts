import * as THREE from 'three'

export type AudiencePresence = {
  id: string
  name: string
}

export type AudienceRingConfig = {
  radius?: number
  height?: number
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
const pulseDurationMs = 350
const pulseScale = 1.35

export function createAudienceRing(config: AudienceRingConfig = {}): AudienceRing {
  const radius = config.radius ?? defaultRadius
  const group = new THREE.Group()
  group.position.y = config.height ?? defaultHeight

  const geometry = new THREE.SphereGeometry(0.085, 16, 16)
  const members = new Map<string, THREE.Mesh>()
  const pulses = new Map<string, number>()

  const updateUsers = (users: AudiencePresence[]) => {
    const sorted = [...users].sort((a, b) => a.id.localeCompare(b.id))
    const seen = new Set(sorted.map((user) => user.id))

    for (const [id, mesh] of members) {
      if (!seen.has(id)) {
        group.remove(mesh)
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose())
        } else {
          mesh.material.dispose()
        }
        members.delete(id)
        pulses.delete(id)
      }
    }

    for (const user of sorted) {
      if (!members.has(user.id)) {
        const material = new THREE.MeshBasicMaterial({ color: colorFromID(user.id) })
        const mesh = new THREE.Mesh(geometry.clone(), material)
        mesh.name = user.id
        members.set(user.id, mesh)
        group.add(mesh)
      }
    }

    positionMembers([...members.values()], radius)
  }

  const pulse = (id: string, now: number = safeNow()) => {
    const mesh = members.get(id)
    if (!mesh) {
      return
    }
    mesh.scale.setScalar(pulseScale)
    pulses.set(id, now + pulseDurationMs)
  }

  const tick = (now: number) => {
    for (const [id, until] of pulses) {
      if (now >= until) {
        const mesh = members.get(id)
        if (mesh) {
          mesh.scale.setScalar(1)
        }
        pulses.delete(id)
      }
    }
  }

  const dispose = () => {
    for (const mesh of members.values()) {
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => material.dispose())
      } else {
        mesh.material.dispose()
      }
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
