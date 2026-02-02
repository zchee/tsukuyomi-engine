import Phaser from 'phaser'
import { getSettings, loadSettings, saveSettings, setSettings } from '../game/settings'
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

    const storedSettings = loadSettings()
    if (storedSettings) {
      setSettings(storedSettings)
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

    const settings = getSettings()
    const autoText = this.add
      .text(centerX, centerY + 30, `Auto: ${settings.autoAdvance ? 'On' : 'Off'}`, {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const speedText = this.add
      .text(centerX, centerY + 50, `Text: ${capitalize(settings.textSpeed)}`, {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const soundText = this.add
      .text(centerX, centerY + 70, `Sound: ${settings.soundEnabled ? 'On' : 'Off'}`, {
        fontFamily: 'VT323',
        fontSize: '18px',
        color: '#8aa0b8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    autoText.on('pointerdown', () => {
      const next = setSettings({ autoAdvance: !getSettings().autoAdvance })
      saveSettings(next)
      autoText.setText(`Auto: ${next.autoAdvance ? 'On' : 'Off'}`)
    })

    speedText.on('pointerdown', () => {
      const nextSpeed = nextTextSpeed(getSettings().textSpeed)
      const next = setSettings({ textSpeed: nextSpeed })
      saveSettings(next)
      speedText.setText(`Text: ${capitalize(next.textSpeed)}`)
    })

    soundText.on('pointerdown', () => {
      const next = setSettings({ soundEnabled: !getSettings().soundEnabled })
      saveSettings(next)
      soundText.setText(`Sound: ${next.soundEnabled ? 'On' : 'Off'}`)
    })

    if (progress) {
      const resetText = this.add
        .text(centerX, centerY + 92, 'New Run', {
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

function nextTextSpeed(current: 'slow' | 'normal' | 'fast'): 'slow' | 'normal' | 'fast' {
  if (current === 'slow') {
    return 'normal'
  }
  if (current === 'normal') {
    return 'fast'
  }
  return 'slow'
}

function capitalize(value: string): string {
  if (value.length === 0) {
    return value
  }
  return `${value[0].toUpperCase()}${value.slice(1)}`
}
