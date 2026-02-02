import Phaser from 'phaser'
import { resetState, setState } from '../game/state'
import { clearProgress, loadProgress } from '../game/storage'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene')
  }

  create(): void {
    const centerX = this.scale.width * 0.5
    const centerY = this.scale.height * 0.5

    const progress = loadProgress()
    if (progress) {
      setState(progress)
    } else {
      resetState()
    }

    this.add
      .text(centerX, centerY - 60, 'LUNA LOOP', {
        fontFamily: 'VT323',
        fontSize: '36px',
        color: '#e8f0ff',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY - 34, 'A short loop of song and memory', {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    const startText = this.add
      .text(centerX, centerY + 6, progress ? 'Continue' : 'Start', {
        fontFamily: 'VT323',
        fontSize: '24px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    startText.on('pointerdown', () => {
      this.scene.start('StoryScene')
    })

    if (progress) {
      const resetText = this.add
        .text(centerX, centerY + 30, 'New Run', {
          fontFamily: 'VT323',
          fontSize: '18px',
          color: '#f2d77c',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })

      resetText.on('pointerdown', () => {
        clearProgress()
        resetState()
        this.scene.start('StoryScene')
      })
    }

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.scene.start('StoryScene')
    })
  }
}
