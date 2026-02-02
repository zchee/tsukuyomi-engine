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
      '歌は遥か彼方の岸辺に辿り着く。',
      state.choiceId === 'reply'
        ? '記憶が薄れる前に、返信が届く。'
        : '記憶はいつしか信号となり、残り続ける。',
      grade === 'S'
        ? 'ループは明るく、鮮明に鳴り響く。'
        : grade === 'A'
          ? 'こだまする度、ループは安定していく。'
          : grade === 'B'
            ? 'ループは震えているが、途切れない。'
            : 'ループは滑り落ち、次の試行を待つ。',
      'どこかで、新しいループが始まる。',
    ]

    this.add
      .text(centerX, 40, '終幕', {
        fontFamily: 'DotGothic16',
        fontSize: '24px',
        color: '#e8f0ff',
      })
      .setOrigin(0.5)

    lines.forEach((line, index) => {
      this.add
        .text(centerX, 76 + index * 18, line, {
          fontFamily: 'DotGothic16',
          fontSize: '18px',
          color: '#8aa0b8',
        })
        .setOrigin(0.5)
    })

    const restartText = this.add
      .text(centerX, 150, 'クレジット', {
        fontFamily: 'DotGothic16',
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
