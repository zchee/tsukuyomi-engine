export type ChatClientConfig = {
  container: HTMLElement
  name?: string
  url?: string
  socketFactory?: (url: string) => WebSocketLike
  eventTarget?: EventTarget
}

type WebSocketLike = {
  send: (data: string) => void
  close: () => void
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => void
  removeEventListener: (type: string, listener: (event: MessageEvent) => void) => void
}

export type ChatClientMessage = {
  type: 'chat' | 'name'
  body: string
}

export const chatEventName = 'tsukuyomi:chat'

export type ChatPresence = {
  id: string
  name: string
}

export type ChatEvent = {
  type: 'welcome' | 'presence' | 'chat'
  action?: 'join' | 'leave' | 'rename'
  from?: ChatPresence
  body?: string
  users?: ChatPresence[]
  at?: string
}

export type ChatClient = {
  dispose: () => void
  send: (message: ChatClientMessage) => void
}

export function installChat(config: ChatClientConfig): ChatClient | null {
  if (!config.container) {
    return null
  }

  const root = document.createElement('section')
  root.className = 'chat-panel'

  const header = document.createElement('div')
  header.className = 'chat-header'

  const title = document.createElement('span')
  title.textContent = 'Live'

  const status = document.createElement('span')
  status.className = 'chat-status'
  status.textContent = 'Connecting'

  const usersCount = document.createElement('span')
  usersCount.className = 'chat-count'
  usersCount.textContent = '0'

  header.append(title, status, usersCount)

  const userList = document.createElement('ul')
  userList.className = 'chat-users'

  const messages = document.createElement('div')
  messages.className = 'chat-messages'

  const reactions = document.createElement('div')
  reactions.className = 'chat-reactions'

  const form = document.createElement('form')
  form.className = 'chat-input'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Say hi...'
  input.maxLength = 280

  const sendButton = document.createElement('button')
  sendButton.type = 'submit'
  sendButton.textContent = 'Send'

  form.append(input, sendButton)
  root.append(header, userList, messages, reactions, form)
  config.container.appendChild(root)

  const socketFactory = config.socketFactory ?? ((url: string) => new WebSocket(url))
  const url = config.url ?? buildWebSocketURL(window.location, config.name)
  const socket = socketFactory(url)
  const eventTarget =
    config.eventTarget ?? (typeof window === 'object' ? (window as unknown as EventTarget) : null)

  const users = new Map<string, ChatPresence>()
  let disposed = false
  const reactionListeners = new Map<HTMLButtonElement, () => void>()

  const updateUsers = (list: ChatPresence[]) => {
    users.clear()
    list.forEach((user) => users.set(user.id, user))
    renderUsers(userList, usersCount, users)
  }

  const addSystemMessage = (text: string) => {
    messages.appendChild(renderMessage('system', text))
    messages.scrollTop = messages.scrollHeight
  }

  const addChatMessage = (from: string, body: string) => {
    messages.appendChild(renderMessage(from, body))
    messages.scrollTop = messages.scrollHeight
  }

  const handleEvent = (event: ChatEvent) => {
    if (event.type === 'welcome') {
      if (event.users) {
        updateUsers(event.users)
      }
      if (event.from?.name) {
        addSystemMessage(`You are ${event.from.name}`)
      }
      status.textContent = 'Online'
      emitChatEvent(eventTarget, event)
      return
    }

    if (event.type === 'presence') {
      if (event.action === 'join' && event.from) {
        users.set(event.from.id, event.from)
        renderUsers(userList, usersCount, users)
        addSystemMessage(`${event.from.name} joined`)
      }
      if (event.action === 'leave' && event.from) {
        users.delete(event.from.id)
        renderUsers(userList, usersCount, users)
        addSystemMessage(`${event.from.name} left`)
      }
      if (event.action === 'rename' && event.from) {
        const previous = event.body ?? 'Someone'
        users.set(event.from.id, event.from)
        renderUsers(userList, usersCount, users)
        addSystemMessage(`${previous} is now ${event.from.name}`)
      }
      emitChatEvent(eventTarget, event)
      return
    }

    if (event.type === 'chat' && event.from && event.body) {
      addChatMessage(event.from.name, event.body)
      emitChatEvent(eventTarget, event)
    }
  }

  const onMessage = async (event: MessageEvent) => {
    const raw = typeof event.data === 'string' ? event.data : await event.data.text()
    const parsed = safeParse(raw)
    if (!parsed) {
      return
    }
    handleEvent(parsed)
  }

  const onOpen = () => {
    status.textContent = 'Online'
  }

  const onClose = () => {
    status.textContent = 'Offline'
  }

  const sendMessage = (message: ChatClientMessage) => {
    if (disposed) {
      return
    }
    socket.send(JSON.stringify(message))
    if (message.type === 'name') {
      localStorage.setItem('luna-loop-name', message.body)
    }
  }

  const onSubmit = (event: Event) => {
    event.preventDefault()
    const value = input.value
    const message = parseInput(value)
    if (!message) {
      input.value = ''
      return
    }
    sendMessage(message)
    input.value = ''
  }

  for (const reaction of chatReactions) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'chat-reaction'
    button.textContent = reaction.label
    const handler = () => {
      sendMessage({ type: 'chat', body: reaction.body })
    }
    button.addEventListener('click', handler)
    reactionListeners.set(button, handler)
    reactions.appendChild(button)
  }

  socket.addEventListener('message', onMessage)
  socket.addEventListener('open', onOpen)
  socket.addEventListener('close', onClose)
  form.addEventListener('submit', onSubmit)

  return {
    dispose: () => {
      if (disposed) {
        return
      }
      disposed = true
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('close', onClose)
      form.removeEventListener('submit', onSubmit)
      reactionListeners.forEach((handler, button) => {
        button.removeEventListener('click', handler)
      })
      socket.close()
      root.remove()
    },
    send: sendMessage,
  }
}

export function buildWebSocketURL(location: Location, name?: string): string {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  const origin = `${protocol}://${location.host}`
  const url = new URL('/ws', origin)

  const stored = name ?? localStorage.getItem('luna-loop-name') ?? ''
  if (stored) {
    url.searchParams.set('name', stored)
  }

  return url.toString()
}

export function parseInput(input: string): ChatClientMessage | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('/name ')) {
    const name = trimmed.replace('/name ', '').trim()
    if (!name) {
      return null
    }
    return { type: 'name', body: name }
  }

  return { type: 'chat', body: trimmed }
}

function renderUsers(list: HTMLUListElement, count: HTMLElement, users: Map<string, ChatPresence>): void {
  list.innerHTML = ''
  for (const user of users.values()) {
    const item = document.createElement('li')
    item.textContent = user.name
    list.appendChild(item)
  }
  count.textContent = users.size.toString()
}

function renderMessage(author: string, body: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'chat-message'

  const who = document.createElement('span')
  who.className = 'chat-author'
  who.textContent = author

  const text = document.createElement('span')
  text.className = 'chat-body'
  text.textContent = body

  row.append(who, text)
  return row
}

function safeParse(raw: string): ChatEvent | null {
  try {
    return JSON.parse(raw) as ChatEvent
  } catch {
    return null
  }
}

function emitChatEvent(target: EventTarget | null, event: ChatEvent): void {
  if (!target) {
    return
  }
  const customEvent = new CustomEvent<ChatEvent>(chatEventName, { detail: event })
  target.dispatchEvent(customEvent)
}

export const chatReactions = [
  { label: 'Wave', body: '*wave*' },
  { label: 'Clap', body: '*clap*' },
  { label: 'Cheer', body: '*cheer*' },
  { label: 'Encore', body: '*encore*' },
]
