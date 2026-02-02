import Phaser from 'phaser'
import { gradeFromAccuracy } from '../game/rhythm'
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
    const grade = gradeFromAccuracy(accuracy)

    const centerX = this.scale.width * 0.5
    const centerY = this.scale.height * 0.5

    this.add
      .text(centerX, centerY - 50, '結果発表', {
        fontFamily: 'DotGothic16',
        fontSize: '28px',
        color: '#e8f0ff',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY - 10, `評価 ${grade}`, {
        fontFamily: 'DotGothic16',
        fontSize: '32px',
        color: '#7cf2b4',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY + 20, `完璧 ${perfect}  良 ${good}  不可 ${miss}`, {
        fontFamily: 'DotGothic16',
        fontSize: '18px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY + 44, `精度 ${accuracyPct}%`, {
        fontFamily: 'DotGothic16',
        fontSize: '18px',
        color: '#f2d77c',
      })
      .setOrigin(0.5)

    const continueText = this.add
      .text(centerX, centerY + 74, '次へ', {
        fontFamily: 'DotGothic16',
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
