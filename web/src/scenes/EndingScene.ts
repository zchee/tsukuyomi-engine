import Phaser from 'phaser'
import { gradeFromAccuracy } from '../game/rhythm'
import { getState } from '../game/state'

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene')
  }

  create(): void {
    const state = getState()
    const centerX = this.scale.width * 0.5

    const accuracy = state.score?.accuracy ?? 0
    const grade = gradeFromAccuracy(accuracy)

    const lines = [
      'The song lands on a distant shore.',
      state.choiceId === 'reply'
        ? 'A reply arrives before the memory fades.'
        : 'You keep the memory until it becomes a signal.',
      grade === 'S'
        ? 'The loop hums bright and clear.'
        : grade === 'A'
          ? 'The loop steadies with every echo.'
          : grade === 'B'
            ? 'The loop trembles, but holds.'
            : 'The loop slips, waiting for another try.',
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
      .text(centerX, 150, 'Credits', {
        fontFamily: 'VT323',
        fontSize: '20px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    restartText.on('pointerdown', () => {
      this.scene.start('CreditsScene')
    })

    this.input.keyboard?.once('keydown-ENTER', () => {
      this.scene.start('CreditsScene')
    })
  }
}
