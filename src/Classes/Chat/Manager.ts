import type { Chat } from '../../Interfaces'
import { List, ChatInstance } from '../'
import { Factory } from './Controllers'

export class ChatManager implements Chat.Manager {
  private _chatList: List<Chat.Instance> = new List()
  public map?: Map<string, Chat.Instance>

  constructor(private _customIDFlag = false) {
    if (_customIDFlag) this.map = new Map()
  }

  spawn(
    controllerClassName: Chat.Controller.Factory.supportedControllers,
    options?: { [key: string]: string },
    customID?: string,
  ): Chat.Instance {
    if (this._customIDFlag && !customID) throw new Error('Custom ID required')
    let controller = Factory.create(controllerClassName, options)

    let newChat
    if (this._customIDFlag && customID) {
      newChat = this.map!.get(customID)
      if (newChat) return newChat
      newChat = new ChatInstance(customID, controller)
      this.map!.set(customID, newChat)
    } else {
      newChat = new ChatInstance(this._chatList.freeSpace, controller)
      this._chatList.addOne(newChat)
    }
    return newChat
  }

  get(entityID: number | string): Chat.Instance | undefined {
    if (typeof entityID == 'string') return this.map?.get(entityID)
    return this._chatList.valueOf(entityID)
  }

  has(entityID: number | string): boolean {
    if (typeof entityID == 'string') {
      if (!this.map) return false
      return this.map.has(entityID)
    }
    return !this._chatList.isUndefined(entityID)
  }

  drop(entityID: number | string): boolean {
    let chat
    if (typeof entityID == 'string') {
      if (!this.map) return false
      chat = this.map.get(entityID)
    } else chat = this._chatList.valueOf(entityID)
    if (!chat) return false

    chat.controller.delete().then((status) => {
      if (!status) throw new Error('chat deleting error')
    })
    return this._chatList.delete(chat)
  }
}
