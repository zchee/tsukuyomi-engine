import type { StoryNode } from './types'
import { storyScript } from './data/story'

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
