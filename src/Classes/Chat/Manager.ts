import type { Chat } from '../../Interfaces'
import { List } from '../List'
import { Factory } from './Controllers'
import { ChatInstance } from './Instance'

export class ChatManager implements Chat.Manager {
  private _chatList: List<Chat.Instance> = new List()
  spawn(
    controllerClassName: Chat.Controller.Factory.supportedControllers,
    options?: { [key: string]: string },
  ): Chat.Instance {
    let controller = Factory.create(controllerClassName, options)

    let newChat = new ChatInstance(this._chatList.freeSpace, controller)

    this._chatList.addOne(newChat)
    return newChat
  }

  get(entityID: number): Chat.Instance | undefined {
    return this._chatList.valueOf(entityID)
  }

  has(entityID: number): boolean {
    return !this._chatList.isUndefined(entityID)
  }

  drop(entityID: number): boolean {
    let chat = this._chatList.valueOf(entityID)
    if (!chat) return true

    chat.controller.delete().then((status) => {
      if (!status) throw new Error('chat deleting error')
    })
    return this._chatList.delete(chat)
  }
}
