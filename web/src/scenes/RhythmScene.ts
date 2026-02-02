import Phaser from 'phaser'
import { beatmap } from '../game/data/beatmap'
import { GOOD_WINDOW_MS, HIT_LINE_Y, NOTE_TRAVEL_MS } from '../game/constants'
import { evaluateHit, summarizeHits } from '../game/rhythm'
import { getState, setState } from '../game/state'
import { saveProgress } from '../game/storage'
import type { HitResult } from '../game/types'

type NoteStatus = 'pending' | 'hit' | 'miss'

export class RhythmScene extends Phaser.Scene {
  private audioContext: AudioContext | null = null
  private songStartTime = 0
  private noteStatuses: NoteStatus[] = []
  private hitResults: HitResult[] = []
  private graphics?: Phaser.GameObjects.Graphics
  private scoreText?: Phaser.GameObjects.Text
  private readyText?: Phaser.GameObjects.Text
  private started = false

  constructor() {
    super('RhythmScene')
  }

  create(): void {
    const state = getState()
    if (state.hasPlayedRhythm && state.score) {
      this.scene.start('ResultScene')
      return
    }

    this.noteStatuses = beatmap.notes.map(() => 'pending')
    this.hitResults = []

    this.graphics = this.add.graphics()
    this.scoreText = this.add.text(12, 12, 'Perfect 0 | Good 0 | Miss 0', {
      fontFamily: 'VT323',
      fontSize: '16px',
      color: '#e8f0ff',
    })

    this.readyText = this.add
      .text(this.scale.width * 0.5, this.scale.height * 0.5, 'Tap or Space to start', {
        fontFamily: 'VT323',
        fontSize: '20px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)

    this.input.on('pointerdown', () => {
      if (!this.started) {
        this.startRhythm()
        return
      }
      this.tryHit()
    })

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.started) {
        this.startRhythm()
        return
      }
      this.tryHit()
    })
  }

  update(): void {
    if (!this.started || !this.audioContext || !this.graphics) {
      return
    }

    const currentMs = (this.audioContext.currentTime - this.songStartTime) * 1000

    this.renderNotes(currentMs)
    this.checkMisses(currentMs)

    const lastNote = beatmap.notes[beatmap.notes.length - 1] ?? 0
    if (currentMs > lastNote + GOOD_WINDOW_MS + 500 && this.noteStatuses.every((status) => status !== 'pending')) {
      const summary = summarizeHits(this.hitResults)
      setState({ hasPlayedRhythm: true, score: summary })
      saveProgress(getState())
      this.scene.start('ResultScene')
    }
  }

  private startRhythm(): void {
    this.started = true
    this.readyText?.setVisible(false)

    this.audioContext = new AudioContext()
    void this.audioContext.resume()

    const master = this.audioContext.createGain()
    master.gain.value = 0.2
    master.connect(this.audioContext.destination)

    this.songStartTime = this.audioContext.currentTime + beatmap.offsetMs / 1000

    for (const noteMs of beatmap.notes) {
      const time = this.songStartTime + noteMs / 1000
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()

      osc.type = 'square'
      osc.frequency.value = 660

      gain.gain.setValueAtTime(0.0001, time)
      gain.gain.exponentialRampToValueAtTime(0.2, time + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08)

      osc.connect(gain)
      gain.connect(master)

      osc.start(time)
      osc.stop(time + 0.09)
    }
  }

  private tryHit(): void {
    if (!this.audioContext) {
      return
    }

    const currentMs = (this.audioContext.currentTime - this.songStartTime) * 1000
    let bestIndex = -1
    let bestDelta = Number.POSITIVE_INFINITY

    beatmap.notes.forEach((noteMs, index) => {
      if (this.noteStatuses[index] !== 'pending') {
        return
      }
      const delta = currentMs - noteMs
      const absDelta = Math.abs(delta)
      if (absDelta < bestDelta) {
        bestDelta = absDelta
        bestIndex = index
      }
    })

    if (bestIndex === -1 || bestDelta > GOOD_WINDOW_MS) {
      return
    }

    const noteMs = beatmap.notes[bestIndex]
    const result = evaluateHit(currentMs, noteMs)
    this.noteStatuses[bestIndex] = result.grade === 'miss' ? 'miss' : 'hit'
    this.hitResults.push(result)
    this.updateScoreText()
  }

  private checkMisses(currentMs: number): void {
    beatmap.notes.forEach((noteMs, index) => {
      if (this.noteStatuses[index] !== 'pending') {
        return
      }
      if (currentMs > noteMs + GOOD_WINDOW_MS) {
        this.noteStatuses[index] = 'miss'
        this.hitResults.push({
          grade: 'miss',
          timingMs: currentMs,
          noteMs,
          deltaMs: currentMs - noteMs,
        })
        this.updateScoreText()
      }
    })
  }

  private renderNotes(currentMs: number): void {
    if (!this.graphics) {
      return
    }

    const graphics = this.graphics
    graphics.clear()

    graphics.lineStyle(2, 0x7cf2b4, 1)
    graphics.beginPath()
    graphics.moveTo(20, HIT_LINE_Y)
    graphics.lineTo(this.scale.width - 20, HIT_LINE_Y)
    graphics.strokePath()

    const travelDistance = 96
    const startY = HIT_LINE_Y - travelDistance

    beatmap.notes.forEach((noteMs, index) => {
      if (this.noteStatuses[index] !== 'pending') {
        return
      }
      const timeToNote = noteMs - currentMs
      if (timeToNote > NOTE_TRAVEL_MS || timeToNote < -GOOD_WINDOW_MS) {
        return
      }
      const progress = 1 - timeToNote / NOTE_TRAVEL_MS
      const y = startY + Phaser.Math.Clamp(progress, 0, 1) * travelDistance
      const x = this.scale.width * 0.5 + Math.sin(noteMs * 0.002) * 60

      graphics.fillStyle(0xf2d77c, 1)
      graphics.fillRect(x - 4, y - 4, 8, 8)
      graphics.lineStyle(1, 0x1f2937, 1)
      graphics.strokeRect(x - 4, y - 4, 8, 8)
    })
  }

  private updateScoreText(): void {
    if (!this.scoreText) {
      return
    }

    const summary = summarizeHits(this.hitResults)
    this.scoreText.setText(
      `Perfect ${summary.perfect} | Good ${summary.good} | Miss ${summary.miss}`
    )
  }
}
