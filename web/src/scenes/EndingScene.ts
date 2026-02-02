import Phaser from 'phaser'
import { getState, resetState } from '../game/state'
import { clearProgress } from '../game/storage'

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene')
  }

  create(): void {
    const state = getState()
    const centerX = this.scale.width * 0.5

    const lines = [
      'The song lands on a distant shore.',
      state.choiceId === 'reply'
        ? 'A reply arrives before the memory fades.'
        : 'You keep the memory until it becomes a signal.',
      'Somewhere, a new loop begins.',
    ]

    this.add
      .text(centerX, 40, 'ENDING', {
        fontFamily: 'VT323',
        fontSize: '24px',
        color: '#e8f0ff',
      })
      .setOrigin(0.5)

    lines.forEach((line, index) => {
      this.add
        .text(centerX, 76 + index * 18, line, {
          fontFamily: 'VT323',
          fontSize: '18px',
          color: '#8aa0b8',
        })
        .setOrigin(0.5)
    })

    const restartText = this.add
      .text(centerX, 150, 'Restart', {
        fontFamily: 'VT323',
        fontSize: '20px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    restartText.on('pointerdown', () => {
      clearProgress()
      resetState()
      this.scene.start('TitleScene')
    })
  }
}
