import Phaser from 'phaser'
import { getState } from '../game/state'

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene')
  }

  create(): void {
    const state = getState()
    if (!state.score) {
      this.scene.start('RhythmScene')
      return
    }

    const { perfect, good, miss, accuracy } = state.score
    const accuracyPct = Math.round(accuracy * 100)

    let grade = 'C'
    if (accuracyPct >= 95) {
      grade = 'S'
    } else if (accuracyPct >= 85) {
      grade = 'A'
    } else if (accuracyPct >= 70) {
      grade = 'B'
    }

    const centerX = this.scale.width * 0.5
    const centerY = this.scale.height * 0.5

    this.add
      .text(centerX, centerY - 50, 'RESULT', {
        fontFamily: 'VT323',
        fontSize: '28px',
        color: '#e8f0ff',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY - 10, `Grade ${grade}`, {
        fontFamily: 'VT323',
        fontSize: '32px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY + 20, `Perfect ${perfect}  Good ${good}  Miss ${miss}`, {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY + 44, `Accuracy ${accuracyPct}%`, {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#f2d77c',
      })
      .setOrigin(0.5)

    const continueText = this.add
      .text(centerX, centerY + 74, 'Continue', {
        fontFamily: 'VT323',
        fontSize: '20px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    continueText.on('pointerdown', () => {
      this.scene.start('EndingScene')
    })

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.scene.start('EndingScene')
    })
  }
}
