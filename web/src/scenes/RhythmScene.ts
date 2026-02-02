import Phaser from 'phaser'
import { getBeatmap } from '../game/beatmap'
import { GOOD_WINDOW_MS, HIT_LINE_Y, NOTE_TRAVEL_MS } from '../game/constants'
import { evaluateHit, summarizeHits } from '../game/rhythm'
import { getSettings } from '../game/settings'
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
  private feedbackText?: Phaser.GameObjects.Text
  private readyText?: Phaser.GameObjects.Text
  private helpText?: Phaser.GameObjects.Text
  private pausedText?: Phaser.GameObjects.Text
  private started = false
  private paused = false
  private beatmap = getBeatmap()

  constructor() {
    super('RhythmScene')
  }

  create(): void {
    const state = getState()
    if (state.hasPlayedRhythm && state.score) {
      this.scene.start('ResultScene')
      return
    }

    this.noteStatuses = this.beatmap.notes.map(() => 'pending')
    this.hitResults = []

    this.graphics = this.add.graphics()
    this.scoreText = this.add.text(12, 12, 'Perfect 0 | Good 0 | Miss 0', {
      fontFamily: 'VT323',
      fontSize: '16px',
      color: '#e8f0ff',
    })

    this.feedbackText = this.add
      .text(this.scale.width * 0.5, HIT_LINE_Y - 24, '', {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)

    this.helpText = this.add
      .text(this.scale.width - 12, 12, 'Space/Tap | P: Pause | Esc: Exit', {
        fontFamily: 'VT323',
        fontSize: '12px',
        color: '#8aa0b8',
      })
      .setOrigin(1, 0)

    this.readyText = this.add
      .text(this.scale.width * 0.5, this.scale.height * 0.5, 'Tap or Space to start', {
        fontFamily: 'VT323',
        fontSize: '20px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)

    this.pausedText = this.add
      .text(this.scale.width * 0.5, this.scale.height * 0.5, 'PAUSED', {
        fontFamily: 'VT323',
        fontSize: '24px',
        color: '#f2d77c',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.input.on('pointerdown', () => {
      if (this.paused) {
        return
      }
      if (!this.started) {
        this.startRhythm()
        return
      }
      this.tryHit()
    })

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.paused) {
        return
      }
      if (!this.started) {
        this.startRhythm()
        return
      }
      this.tryHit()
    })

    this.input.keyboard?.on('keydown-P', () => {
      if (!this.started) {
        return
      }
      this.togglePause()
    })

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('TitleScene')
    })
  }

  update(): void {
    if (!this.started || this.paused || !this.audioContext || !this.graphics) {
      return
    }

    const currentMs = (this.audioContext.currentTime - this.songStartTime) * 1000

    this.renderNotes(currentMs)
    this.checkMisses(currentMs)

    const lastNote = this.beatmap.notes[this.beatmap.notes.length - 1] ?? 0
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
    const settings = getSettings()
    master.gain.value = settings.soundEnabled ? 0.2 : 0
    master.connect(this.audioContext.destination)

    this.songStartTime = this.audioContext.currentTime + this.beatmap.offsetMs / 1000

    if (!settings.soundEnabled) {
      return
    }

    for (const noteMs of this.beatmap.notes) {
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

  private togglePause(): void {
    this.paused = !this.paused
    if (this.pausedText) {
      this.pausedText.setVisible(this.paused)
    }
    if (this.audioContext) {
      if (this.paused) {
        void this.audioContext.suspend()
      } else {
        void this.audioContext.resume()
      }
    }
  }

  private tryHit(): void {
    if (!this.audioContext) {
      return
    }

    const currentMs = (this.audioContext.currentTime - this.songStartTime) * 1000
    let bestIndex = -1
    let bestDelta = Number.POSITIVE_INFINITY

    this.beatmap.notes.forEach((noteMs, index) => {
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

    const noteMs = this.beatmap.notes[bestIndex]
    const result = evaluateHit(currentMs, noteMs)
    this.noteStatuses[bestIndex] = result.grade === 'miss' ? 'miss' : 'hit'
    this.hitResults.push(result)
    this.updateFeedback(result.grade)
    this.updateScoreText()
  }

  private checkMisses(currentMs: number): void {
    this.beatmap.notes.forEach((noteMs, index) => {
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
        this.updateFeedback('miss')
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

    this.beatmap.notes.forEach((noteMs, index) => {
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

  private updateFeedback(grade: 'perfect' | 'good' | 'miss'): void {
    if (!this.feedbackText) {
      return
    }

    const color = grade === 'perfect' ? '#7cf2b4' : grade === 'good' ? '#f2d77c' : '#ff6b6b'
    this.feedbackText.setColor(color)
    this.feedbackText.setText(grade.toUpperCase())
  }
}
