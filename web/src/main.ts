import './style.css'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './game/constants'
import { CreditsScene } from './scenes/CreditsScene'
import { EndingScene } from './scenes/EndingScene'
import { ResultScene } from './scenes/ResultScene'
import { RhythmScene } from './scenes/RhythmScene'
import { StoryScene } from './scenes/StoryScene'
import { TitleScene } from './scenes/TitleScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  backgroundColor: '#0b0f14',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, StoryScene, RhythmScene, ResultScene, EndingScene, CreditsScene],
}

new Phaser.Game(config)
