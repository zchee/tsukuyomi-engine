import Phaser from 'phaser'
import { getSettings, loadSettings, saveSettings, setSettings } from '../game/settings'
import { resetState, setState } from '../game/state'
import { clearProgress, loadProgress } from '../game/storage'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene')
  }

  create(): void {
    const { width, height } = this.scale
    const centerX = width * 0.5
    const centerY = height * 0.5

    // --- Background Operations (Super Visuals) ---

    // 1. Starry Sky
    for (let i = 0; i < 100; i++) {
        const x = Phaser.Math.Between(0, width)
        const y = Phaser.Math.Between(0, height)
        const alpha = Phaser.Math.FloatBetween(0.1, 0.6)
        this.add.rectangle(x, y, 1, 1, 0xFFFFFF, alpha)
    }

    // 2. The Moon (Super Glowing)
    // Outer Aura
    this.add.circle(centerX, centerY - 45, 60, 0xf2d77c, 0.05).setScale(1.5)
    this.add.circle(centerX, centerY - 45, 50, 0xf2d77c, 0.1)
    // Core
    const moon = this.add.circle(centerX, centerY - 45, 40, 0xffffdd, 1)
    
    this.tweens.add({
      targets: moon,
      alpha: { from: 0.9, to: 1 },
      scale: { from: 1, to: 1.05 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })

    // 3. Main Title: SUPER KAGUYA-HIME!
    const titleText = this.add
      .text(centerX, centerY - 45, 'スーパー\nかぐや姫！', {
        fontFamily: 'DotGothic16',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#ff0055',
        strokeThickness: 6,
        align: 'center',
        shadow: {
            offsetX: 0,
            offsetY: 4,
            color: '#740026',
            blur: 0,
            stroke: true,
            fill: true
        }
      })
      .setOrigin(0.5)

    // Dynamic Title Animation
    this.tweens.add({
      targets: titleText,
      scale: { from: 1, to: 1.05 },
      angle: { from: -1, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })

    // Subtitle
    this.add.text(centerX, centerY + 10, '永遠の月の姫', {
        fontFamily: 'DotGothic16',
        fontSize: '12px',
        color: '#f2d77c'
    }).setOrigin(0.5)

    // --- Game Logic & Menu ---

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

    const menuBaseY = centerY + 40

    const startText = this.add
      .text(centerX, menuBaseY, progress ? '旅を続ける' : '冒険を始める', {
        fontFamily: 'DotGothic16',
        fontSize: '20px',
        color: '#7cf2b4',
        shadow: { offsetX: 0, offsetY: 2, color: '#2d4f3e', blur: 0, fill: true }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    
    // Pulse animation for start
    this.tweens.add({
        targets: startText,
        alpha: { from: 0.7, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1
    })

    startText.on('pointerdown', () => {
      this.scene.start('StoryScene')
    })

    const settings = getSettings()
    const settingsStyle = { fontFamily: 'DotGothic16', fontSize: '16px', color: '#8aa0b8' }

    // Settings Row
    const autoText = this.add
      .text(centerX - 80, menuBaseY + 25, `自動: ${settings.autoAdvance ? 'ON' : 'OFF'}`, settingsStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const speedText = this.add
      .text(centerX, menuBaseY + 25, `文字: ${translateSpeed(settings.textSpeed)}`, settingsStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    const soundText = this.add
      .text(centerX + 80, menuBaseY + 25, `音: ${settings.soundEnabled ? 'ON' : 'OFF'}`, settingsStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    autoText.on('pointerdown', () => {
      const next = setSettings({ autoAdvance: !getSettings().autoAdvance })
      saveSettings(next)
      autoText.setText(`自動: ${next.autoAdvance ? 'ON' : 'OFF'}`)
      flashElement(this, autoText)
    })

    speedText.on('pointerdown', () => {
      const nextSpeed = nextTextSpeed(getSettings().textSpeed)
      const next = setSettings({ textSpeed: nextSpeed })
      saveSettings(next)
      speedText.setText(`文字: ${translateSpeed(next.textSpeed)}`)
      flashElement(this, speedText)
    })

    soundText.on('pointerdown', () => {
      const next = setSettings({ soundEnabled: !getSettings().soundEnabled })
      saveSettings(next)
      soundText.setText(`音: ${next.soundEnabled ? 'ON' : 'OFF'}`)
      flashElement(this, soundText)
    })

    if (progress) {
      const resetText = this.add
        .text(centerX, menuBaseY + 45, '記憶を消去', {
          fontFamily: 'DotGothic16',
          fontSize: '14px',
          color: '#ff6b6b',
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

    // Helper to flash text when clicked
    function flashElement(scene: Phaser.Scene, text: Phaser.GameObjects.Text) {
        text.setColor('#ffffff')
        scene.time.delayedCall(150, () => text.setColor('#8aa0b8'))
    }
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

function translateSpeed(value: string): string {
  switch (value) {
    case 'slow': return '遅'
    case 'normal': return '普'
    case 'fast': return '速'
    default: return value
  }
}
