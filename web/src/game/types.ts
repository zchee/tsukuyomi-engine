export type HitGrade = 'perfect' | 'good' | 'miss'

export type HitResult = {
  grade: HitGrade
  timingMs: number
  noteMs: number
  deltaMs: number
}

export type ScoreSummary = {
  perfect: number
  good: number
  miss: number
  score: number
  maxScore: number
  accuracy: number
}

export type Beatmap = {
  bpm: number
  offsetMs: number
  notes: number[]
}

export type StoryChoice = {
  id: string
  label: string
  next: string
}

export type StoryNode = {
  id: string
  lines: string[]
  choices?: StoryChoice[]
  next?: string
}

export type StoryScript = {
  startId: string
  nodes: Record<string, StoryNode>
}

export type Settings = {
  autoAdvance: boolean
  soundEnabled: boolean
  textSpeed: 'slow' | 'normal' | 'fast'
}

export type AppState = {
  storyNodeId: string
  choiceId?: string
  hasPlayedRhythm: boolean
  score: ScoreSummary | null
}
