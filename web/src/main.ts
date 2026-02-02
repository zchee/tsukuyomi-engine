import './style.css'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './game/constants'
import { CreditsScene } from './scenes/CreditsScene'
import { EndingScene } from './scenes/EndingScene'
import { ResultScene } from './scenes/ResultScene'
import { RhythmScene } from './scenes/RhythmScene'
import { StoryScene } from './scenes/StoryScene'
import { TitleScene } from './scenes/TitleScene'
import { installChat } from './chat/chat'
import { installVrLauncher } from './vr/launcher'

const app = document.getElementById('app')
if (!app) {
  throw new Error('App root element not found')
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
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

const game = new Phaser.Game(config)
const chatEvents = new EventTarget()
const chatClient = installChat({ container: document.body, eventTarget: chatEvents })
const vrLauncher = installVrLauncher({
  canvas: game.canvas,
  container: document.body,
  gameWidth: GAME_WIDTH,
  gameHeight: GAME_HEIGHT,
  chatEventTarget: chatEvents,
  chatSend: chatClient?.send,
})

window.addEventListener('beforeunload', () => {
  chatClient?.dispose()
  vrLauncher?.dispose()
})
