import Phaser from 'phaser'
import { getCredits } from '../game/credits'
import { clearProgress } from '../game/storage'
import { resetState } from '../game/state'

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('CreditsScene')
  }

  create(): void {
    const centerX = this.scale.width * 0.5
    const credits = getCredits()

    this.add
      .text(centerX, 24, credits.title, {
        fontFamily: 'VT323',
        fontSize: '24px',
        color: '#e8f0ff',
      })
      .setOrigin(0.5)

    credits.entries.forEach((entry, index) => {
      this.add
        .text(centerX, 56 + index * 18, `${entry.role}: ${entry.name}`, {
          fontFamily: 'VT323',
          fontSize: '16px',
          color: '#8aa0b8',
        })
        .setOrigin(0.5)
    })

    const restartText = this.add
      .text(centerX, 150, 'Back to Title', {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    restartText.on('pointerdown', () => {
      clearProgress()
      resetState()
      this.scene.start('TitleScene')
    })

    this.input.keyboard?.once('keydown-ENTER', () => {
      clearProgress()
      resetState()
      this.scene.start('TitleScene')
    })
  }
}
