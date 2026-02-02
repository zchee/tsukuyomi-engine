import Phaser from 'phaser'
import { getState, setState } from '../game/state'
import { saveProgress } from '../game/storage'
import { getStoryNode } from '../game/story'
import { advanceReveal } from '../game/text'
import type { StoryChoice, StoryNode } from '../game/types'

export class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene')
  }

  create(): void {
    const state = getState()
    if (state.hasPlayedRhythm && state.score) {
      this.scene.start('ResultScene')
      return
    }

    let node: StoryNode = getStoryNode(state.storyNodeId)
    let lineIndex = 0

    const portrait = this.add.graphics()
    portrait.fillStyle(0x101826, 1)
    portrait.fillRect(14, 14, 52, 52)
    portrait.lineStyle(2, 0x1f2937, 1)
    portrait.strokeRect(14, 14, 52, 52)
    portrait.fillStyle(0x7cf2b4, 1)
    portrait.fillRect(24, 24, 8, 8)
    portrait.fillStyle(0xf2d77c, 1)
    portrait.fillRect(40, 24, 8, 8)
    portrait.fillStyle(0xe8f0ff, 1)
    portrait.fillRect(32, 38, 12, 8)

    this.add.text(72, 18, 'YOU', {
      fontFamily: 'VT323',
      fontSize: '16px',
      color: '#f2d77c',
    })

    this.add.text(this.scale.width - 16, 18, 'Loop 01', {
      fontFamily: 'VT323',
      fontSize: '14px',
      color: '#8aa0b8',
    }).setOrigin(1, 0)

    const box = this.add.graphics()
    box.fillStyle(0x0b0f14, 0.8)
    box.fillRoundedRect(12, 96, this.scale.width - 24, 72, 6)
    box.lineStyle(2, 0x1f2937, 1)
    box.strokeRoundedRect(12, 96, this.scale.width - 24, 72, 6)

    const text = this.add.text(20, 104, '', {
      fontFamily: 'VT323',
      fontSize: '18px',
      color: '#e8f0ff',
      wordWrap: { width: this.scale.width - 40 },
    })

    const hint = this.add
      .text(this.scale.width - 16, 168, 'Tap/Space | A: Auto', {
        fontFamily: 'VT323',
        fontSize: '14px',
        color: '#8aa0b8',
      })
      .setOrigin(1, 1)

    let choiceTexts: Phaser.GameObjects.Text[] = []
    let currentLine = ''
    let visibleChars = 0
    let lineComplete = false
    let autoAdvance = false
    let autoTimerMs = 0
    const revealSpeed = 40
    const autoDelayMs = 650

    const showLine = () => {
      currentLine = node.lines[lineIndex]
      visibleChars = 0
      lineComplete = currentLine.length === 0
      autoTimerMs = 0
      text.setText('')
    }

    const clearChoices = () => {
      for (const choice of choiceTexts) {
        choice.destroy()
      }
      choiceTexts = []
    }

    const showChoices = (choices: StoryChoice[]) => {
      hint.setVisible(false)
      clearChoices()
      this.input.off('pointerdown', advance)
      choices.forEach((choice, index) => {
        const choiceText = this.add
          .text(24, 112 + index * 22, `> ${choice.label}`, {
            fontFamily: 'VT323',
            fontSize: '18px',
            color: '#7cf2b4',
          })
          .setInteractive({ useHandCursor: true })

        choiceText.on('pointerdown', () => {
          setState({ choiceId: choice.id, storyNodeId: choice.next })
          saveProgress(getState())
          node = getStoryNode(choice.next)
          lineIndex = 0
          hint.setVisible(true)
          clearChoices()
          this.input.on('pointerdown', advance)
          showLine()
        })

        choiceTexts.push(choiceText)
      })
    }

    const advance = () => {
      if (choiceTexts.length > 0) {
        return
      }

      if (!lineComplete) {
        visibleChars = currentLine.length
        lineComplete = true
        text.setText(currentLine)
        return
      }

      lineIndex += 1

      if (lineIndex < node.lines.length) {
        showLine()
        return
      }

      if (node.choices && node.choices.length > 0) {
        showChoices(node.choices)
        return
      }

      if (node.next === 'rhythm') {
        setState({ storyNodeId: node.id })
        saveProgress(getState())
        this.scene.start('RhythmScene')
        return
      }

      if (node.next) {
        setState({ storyNodeId: node.next })
        saveProgress(getState())
        node = getStoryNode(node.next)
        lineIndex = 0
        showLine()
      }
    }

    showLine()
    this.input.on('pointerdown', advance)
    this.input.keyboard?.on('keydown-SPACE', advance)
    this.input.keyboard?.on('keydown-A', () => {
      autoAdvance = !autoAdvance
      hint.setText(autoAdvance ? 'Auto ON | Tap/Space' : 'Tap/Space | A: Auto')
    })

    this.events.on('update', (_time: number, delta: number) => {
      if (lineComplete || choiceTexts.length > 0) {
        if (autoAdvance && lineComplete && choiceTexts.length === 0) {
          autoTimerMs += delta
          if (autoTimerMs >= autoDelayMs) {
            autoTimerMs = 0
            advance()
          }
        }
        return
      }

      visibleChars = advanceReveal(visibleChars, delta, revealSpeed, currentLine.length)
      const visibleText = currentLine.slice(0, Math.floor(visibleChars))
      text.setText(visibleText)
      if (visibleText.length >= currentLine.length) {
        lineComplete = true
      }
    })
  }
}
