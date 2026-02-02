import rawCredits from './data/credits.json'

export type CreditsEntry = {
  role: string
  name: string
}

export type Credits = {
  title: string
  entries: CreditsEntry[]
}

const credits = loadCredits(rawCredits)

export function getCredits(): Credits {
  return credits
}

function loadCredits(value: unknown): Credits {
  if (!isCredits(value)) {
    throw new Error('Invalid credits data')
  }
  return value
}

function isCredits(value: unknown): value is Credits {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as Credits
  if (typeof candidate.title !== 'string') {
    return false
  }
  if (!Array.isArray(candidate.entries)) {
    return false
  }
  return candidate.entries.every(
    (entry) =>
      typeof entry.role === 'string' &&
      typeof entry.name === 'string' &&
      entry.role.length > 0 &&
      entry.name.length > 0
  )
}
