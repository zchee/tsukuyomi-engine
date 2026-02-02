import { describe, expect, it } from 'vitest'
import { buildWebSocketURL, chatEventName, chatReactions, installChat, parseInput } from './chat'

type Listener = (event: MessageEvent) => void

class FakeSocket {
  sent: string[] = []
  closed = false
  private listeners = new Map<string, Set<Listener>>()

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.closed = true
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)?.add(listener)
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type: string, data?: string) {
    const event = type === 'message' ? ({ data } as MessageEvent) : (new Event(type) as MessageEvent)
    this.listeners.get(type)?.forEach((listener) => listener(event))
  }
}

describe('buildWebSocketURL', () => {
  it('builds a ws url and applies name', () => {
    const location = { protocol: 'http:', host: 'localhost:8080' } as Location
    const url = buildWebSocketURL(location, 'Alice')
    expect(url).toBe('ws://localhost:8080/ws?name=Alice')
  })

  it('uses wss for https', () => {
    const location = { protocol: 'https:', host: 'example.com' } as Location
    const url = buildWebSocketURL(location, 'Bob')
    expect(url).toBe('wss://example.com/ws?name=Bob')
  })
})

describe('parseInput', () => {
  it('returns null for empty input', () => {
    expect(parseInput('   ')).toBeNull()
  })

  it('parses name command', () => {
    expect(parseInput('/name Alice')).toEqual({ type: 'name', body: 'Alice' })
  })

  it('parses chat input', () => {
    expect(parseInput('hello')).toEqual({ type: 'chat', body: 'hello' })
  })
})

describe('installChat', () => {
  it('renders users and messages from server events', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const socket = new FakeSocket()
    const client = installChat({
      container,
      name: 'Alice',
      socketFactory: () => socket,
      url: 'ws://localhost/ws',
    })

    socket.emit('open')
    socket.emit(
      'message',
      JSON.stringify({
        type: 'welcome',
        from: { id: '1', name: 'Alice' },
        users: [{ id: '1', name: 'Alice' }],
      })
    )

    const count = container.querySelector('.chat-count')
    expect(count?.textContent).toBe('1')

    socket.emit(
      'message',
      JSON.stringify({
        type: 'presence',
        action: 'join',
        from: { id: '2', name: 'Bob' },
      })
    )

    const listItems = container.querySelectorAll('.chat-users li')
    expect(listItems.length).toBe(2)

    socket.emit(
      'message',
      JSON.stringify({
        type: 'chat',
        from: { id: '2', name: 'Bob' },
        body: 'hello',
      })
    )

    const messages = container.querySelectorAll('.chat-message')
    expect(messages.length).toBeGreaterThan(0)

    socket.emit('message', '{invalid')

    client?.dispose()
    expect(container.querySelector('.chat-panel')).toBeNull()
    expect(socket.closed).toBe(true)
  })

  it('dispatches chat events on the configured event target', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const socket = new FakeSocket()
    const eventTarget = new EventTarget()
    const received: unknown[] = []
    eventTarget.addEventListener(chatEventName, (event) => {
      received.push((event as CustomEvent).detail)
    })

    const client = installChat({
      container,
      name: 'Alice',
      socketFactory: () => socket,
      url: 'ws://localhost/ws',
      eventTarget,
    })

    socket.emit(
      'message',
      JSON.stringify({
        type: 'welcome',
        from: { id: '1', name: 'Alice' },
        users: [{ id: '1', name: 'Alice' }],
      })
    )

    expect(received.length).toBe(1)
    client?.dispose()
  })

  it('sends reaction messages from reaction buttons', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const socket = new FakeSocket()
    const client = installChat({
      container,
      socketFactory: () => socket,
      url: 'ws://localhost/ws',
    })

    const buttons = container.querySelectorAll('.chat-reaction')
    expect(buttons.length).toBe(chatReactions.length)

    const firstButton = buttons[0] as HTMLButtonElement
    firstButton.click()

    expect(socket.sent.length).toBe(1)
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'chat', body: chatReactions[0].body })

    client?.dispose()
  })

  it('sends messages via the client send helper', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const socket = new FakeSocket()
    const client = installChat({
      container,
      socketFactory: () => socket,
      url: 'ws://localhost/ws',
    })

    client?.send({ type: 'chat', body: 'hello' })

    expect(socket.sent.length).toBe(1)
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'chat', body: 'hello' })

    client?.dispose()
  })
})
