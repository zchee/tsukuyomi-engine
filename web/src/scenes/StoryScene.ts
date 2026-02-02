import Phaser from 'phaser'
import { appendHistory } from '../game/history'
import { getSettings, saveSettings, setSettings } from '../game/settings'
import { getState, setState } from '../game/state'
import { saveProgress } from '../game/storage'
import { getStoryNode } from '../game/story'
import { advanceReveal, charsPerSecondFromSpeed } from '../game/text'
import type { StoryChoice, StoryNode } from '../game/types'

export class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene')
  }

  create(): void {
    const state = getState()
    if (state.hasPlayedRhythm && state.score) {
      this.scene.start('ResultScene')
      return
    }

    let node: StoryNode = getStoryNode(state.storyNodeId)
    let lineIndex = 0

    const portrait = this.add.graphics()
    portrait.fillStyle(0x101826, 1)
    portrait.fillRect(14, 14, 52, 52)
    portrait.lineStyle(2, 0x1f2937, 1)
    portrait.strokeRect(14, 14, 52, 52)
    portrait.fillStyle(0x7cf2b4, 1)
    portrait.fillRect(24, 24, 8, 8)
    portrait.fillStyle(0xf2d77c, 1)
    portrait.fillRect(40, 24, 8, 8)
    portrait.fillStyle(0xe8f0ff, 1)
    portrait.fillRect(32, 38, 12, 8)

    this.add.text(72, 18, 'あなた', {
      fontFamily: 'DotGothic16',
      fontSize: '16px',
      color: '#f2d77c',
    })

    this.add.text(this.scale.width - 16, 18, 'ループ 01', {
      fontFamily: 'DotGothic16',
      fontSize: '14px',
      color: '#8aa0b8',
    }).setOrigin(1, 0)

    const box = this.add.graphics()
    box.fillStyle(0x0b0f14, 0.8)
    box.fillRoundedRect(12, 96, this.scale.width - 24, 72, 6)
    box.lineStyle(2, 0x1f2937, 1)
    box.strokeRoundedRect(12, 96, this.scale.width - 24, 72, 6)

    const text = this.add.text(20, 104, '', {
      fontFamily: 'DotGothic16',
      fontSize: '18px',
      color: '#e8f0ff',
      wordWrap: { width: this.scale.width - 40 },
    })

    const settings = getSettings()
    let autoAdvance = settings.autoAdvance

    const hint = this.add
      .text(
        this.scale.width - 16,
        168,
        autoAdvance ? '自動ON | タップ/Space | L: ログ' : 'タップ/Space | A: 自動 | L: ログ',
        {
          fontFamily: 'DotGothic16',
          fontSize: '14px',
          color: '#8aa0b8',
        }
      )
      .setOrigin(1, 1)

    const logPanel = this.add.graphics()
    logPanel.fillStyle(0x05070b, 0.92)
    logPanel.fillRoundedRect(10, 20, this.scale.width - 20, 150, 6)
    logPanel.lineStyle(2, 0x1f2937, 1)
    logPanel.strokeRoundedRect(10, 20, this.scale.width - 20, 150, 6)
    logPanel.setVisible(false)

    const logTitle = this.add
      .text(20, 28, 'ログ', {
        fontFamily: 'DotGothic16',
        fontSize: '16px',
        color: '#f2d77c',
      })
      .setVisible(false)

    const logText = this.add
      .text(20, 48, '', {
        fontFamily: 'DotGothic16',
        fontSize: '14px',
        color: '#e8f0ff',
        wordWrap: { width: this.scale.width - 40 },
      })
      .setVisible(false)

    let choiceTexts: Phaser.GameObjects.Text[] = []
    let currentLine = ''
    let visibleChars = 0
    let lineComplete = false
    let autoTimerMs = 0
    let hasRecordedLine = false
    let history: string[] = []
    let logOpen = false
    const maxHistoryLines = 8
    const revealSpeed = charsPerSecondFromSpeed(settings.textSpeed)
    const autoDelayMs = 650

    const showLine = () => {
      currentLine = node.lines[lineIndex]
      visibleChars = 0
      lineComplete = currentLine.length === 0
      autoTimerMs = 0
      hasRecordedLine = false
      text.setText('')
    }

    const recordHistory = (line: string) => {
      if (hasRecordedLine) {
        return
      }
      history = appendHistory(history, line, maxHistoryLines)
      hasRecordedLine = true
      logText.setText(history.join('\n'))
    }

    const clearChoices = () => {
      for (const choice of choiceTexts) {
        choice.destroy()
      }
      choiceTexts = []
    }

    const showChoices = (choices: StoryChoice[]) => {
      hint.setVisible(false)
      clearChoices()
      this.input.off('pointerdown', advance)
      choices.forEach((choice, index) => {
        const choiceText = this.add
          .text(24, 112 + index * 22, `> ${choice.label}`, {
            fontFamily: 'DotGothic16',
            fontSize: '18px',
            color: '#7cf2b4',
          })
          .setInteractive({ useHandCursor: true })

        choiceText.on('pointerdown', () => {
          setState({ choiceId: choice.id, storyNodeId: choice.next })
          saveProgress(getState())
          history = appendHistory(history, `> ${choice.label}`, maxHistoryLines)
          logText.setText(history.join('\n'))
          node = getStoryNode(choice.next)
          lineIndex = 0
          hint.setVisible(true)
          clearChoices()
          this.input.on('pointerdown', advance)
          showLine()
        })

        choiceTexts.push(choiceText)
      })
    }

    const advance = () => {
      if (logOpen) {
        return
      }
      if (choiceTexts.length > 0) {
        return
      }

      if (!lineComplete) {
        visibleChars = currentLine.length
        lineComplete = true
        text.setText(currentLine)
        recordHistory(currentLine)
        return
      }

      recordHistory(currentLine)
      lineIndex += 1

      if (lineIndex < node.lines.length) {
        showLine()
        return
      }

      if (node.choices && node.choices.length > 0) {
        showChoices(node.choices)
        return
      }

      if (node.next === 'rhythm') {
        setState({ storyNodeId: node.id })
        saveProgress(getState())
        this.scene.start('RhythmScene')
        return
      }

      if (node.next) {
        setState({ storyNodeId: node.next })
        saveProgress(getState())
        node = getStoryNode(node.next)
        lineIndex = 0
        showLine()
      }
    }

    showLine()
    this.input.on('pointerdown', advance)
    this.input.keyboard?.on('keydown-SPACE', advance)
    this.input.keyboard?.on('keydown-A', () => {
      autoAdvance = !autoAdvance
      const next = setSettings({ autoAdvance })
      saveSettings(next)
      hint.setText(
        next.autoAdvance ? '自動ON | タップ/Space | L: ログ' : 'タップ/Space | A: 自動 | L: ログ'
      )
    })

    this.input.keyboard?.on('keydown-L', () => {
      logOpen = !logOpen
      logPanel.setVisible(logOpen)
      logTitle.setVisible(logOpen)
      logText.setVisible(logOpen)
    })

    this.events.on('update', (_time: number, delta: number) => {
      if (logOpen) {
        return
      }
      if (lineComplete || choiceTexts.length > 0) {
        if (autoAdvance && lineComplete && choiceTexts.length === 0) {
          autoTimerMs += delta
          if (autoTimerMs >= autoDelayMs) {
            autoTimerMs = 0
            advance()
          }
        }
        return
      }

      visibleChars = advanceReveal(visibleChars, delta, revealSpeed, currentLine.length)
      const visibleText = currentLine.slice(0, Math.floor(visibleChars))
      text.setText(visibleText)
      if (visibleText.length >= currentLine.length) {
        lineComplete = true
        recordHistory(currentLine)
      }
    })
  }
}
