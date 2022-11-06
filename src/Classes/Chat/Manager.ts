import type { Chat } from '../../Interfaces'
import { ChatInstance } from '../Chat/Instance'
import { Factory } from './Controllers'

export class ChatManager implements Chat.Manager {
  private static _chatMap: Map<string, Chat.Instance> = new Map()

  constructor() {}

  spawn(
    controllerClassName: Chat.Controller.Factory.supportedControllers,
    ID: string,
    options?: { [key: string]: string },
  ): Chat.Instance {
    if (!ID) throw new Error('Chat ID required')
    let controller = Factory.create(controllerClassName, options)
    let newChat = ChatManager._chatMap.get(ID)

    if (newChat) return newChat
    newChat = new ChatInstance(ID, controller)
    ChatManager._chatMap.set(ID, newChat)

    return newChat
  }

  get(ID: string): Chat.Instance | undefined {
    return ChatManager._chatMap.get(ID)
  }

  has(ID: string): boolean {
    return ChatManager._chatMap.has(ID)
  }

  drop(ID: string): boolean {
    let chat = ChatManager._chatMap.get(ID)
    if (!chat) return false

    chat.controller.delete().then((status) => {
      if (!status) throw new Error('chat deleting error')
    })
    return ChatManager._chatMap.delete(ID)
  }
}

export const CHATS = new ChatManager()
