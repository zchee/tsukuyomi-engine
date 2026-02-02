import { describe, expect, it } from 'vitest'
import { createAudienceRing } from './audience'

describe('createAudienceRing', () => {
  it('updates the audience members based on presence list', () => {
    const ring = createAudienceRing({ radius: 2, height: 0.5 })

    ring.updateUsers([
      { id: 'a', name: 'Ada' },
      { id: 'b', name: 'Babbage' },
    ])

    expect(ring.group.children.length).toBe(2)
    expect(ring.group.position.y).toBe(0.5)

    ring.updateUsers([{ id: 'b', name: 'Babbage' }])

    expect(ring.group.children.length).toBe(1)
    expect(ring.group.getObjectByName('a')).toBeUndefined()

    ring.dispose()
  })

  it('pulses members and resets scale after tick', () => {
    const ring = createAudienceRing()
    ring.updateUsers([{ id: 'a', name: 'Ada' }])

    const member = ring.group.getObjectByName('a')
    expect(member).not.toBeNull()

    ring.pulse('a', 100)
    expect(member?.scale.x ?? 1).toBeGreaterThan(1)

    ring.tick(1000)
    expect(member?.scale.x ?? 0).toBeCloseTo(1, 5)

    ring.dispose()
  })

  it('creates and updates nameplates for members', () => {
    const ring = createAudienceRing({ nameplateMaxChars: 24 })
    ring.updateUsers([{ id: 'a', name: 'Ada' }])

    const label = ring.group.getObjectByName('a-label')
    expect(label).not.toBeNull()
    expect(label?.userData.text).toBe('Ada')

    ring.updateUsers([{ id: 'a', name: 'Ada Lovelace' }])

    const updatedLabel = ring.group.getObjectByName('a-label')
    expect(updatedLabel).toBe(label)
    expect(updatedLabel?.userData.text).toBe('Ada Lovelace')

    ring.dispose()
  })
})
