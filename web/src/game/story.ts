import rawStory from './data/story.json'
import type { StoryNode, StoryScript } from './types'

const storyScript = loadStoryScript(rawStory)

export function getStoryStartId(): string {
  return storyScript.startId
}

export function getStoryNode(id: string): StoryNode {
  const node = storyScript.nodes[id]
  if (!node) {
    throw new Error(`Unknown story node: ${id}`)
  }
  return node
}

function loadStoryScript(value: unknown): StoryScript {
  if (!isStoryScript(value)) {
    throw new Error('Invalid story script data')
  }

  return value
}

function isStoryScript(value: unknown): value is StoryScript {
  if (!value || typeof value !== 'object') {
    return false
  }

  const script = value as StoryScript
  if (typeof script.startId !== 'string') {
    return false
  }
  if (!script.nodes || typeof script.nodes !== 'object') {
    return false
  }

  return Object.values(script.nodes).every(isStoryNode)
}

function isStoryNode(value: StoryNode): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }
  if (typeof value.id !== 'string') {
    return false
  }
  if (!Array.isArray(value.lines) || value.lines.some((line) => typeof line !== 'string')) {
    return false
  }
  if (value.choices) {
    if (!Array.isArray(value.choices)) {
      return false
    }
    if (
      value.choices.some(
        (choice) =>
          typeof choice.id !== 'string' ||
          typeof choice.label !== 'string' ||
          typeof choice.next !== 'string'
      )
    ) {
      return false
    }
  }
  if (value.next !== undefined && typeof value.next !== 'string') {
    return false
  }
  return true
}
