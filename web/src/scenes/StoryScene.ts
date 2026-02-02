import Phaser from 'phaser'
import { getState, setState } from '../game/state'
import { saveProgress } from '../game/storage'
import { getStoryNode } from '../game/story'
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
      .text(this.scale.width - 16, 168, 'Tap or Space', {
        fontFamily: 'VT323',
        fontSize: '14px',
        color: '#8aa0b8',
      })
      .setOrigin(1, 1)

    let choiceTexts: Phaser.GameObjects.Text[] = []

    const showLine = () => {
      text.setText(node.lines[lineIndex])
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
  }
}
