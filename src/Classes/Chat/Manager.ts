import type { Chat } from '../../Interfaces'
import { List } from '../List'

export class ChatManager implements Chat.Manager {
  private _chatList: List<Chat.Controller> = new List()
  spawn(): Chat.Controller {
    let newChat = new Chat()

    newChat.id = this._chatList.addOne(newChat)
    return newChat
  }

  get(entityID: number): Chat.Controller | undefined {
    return this._chatList.valueOf(entityID)
  }

  has(entityID: number): boolean {
    return this._chatList.has(entityID)
  }

  drop(entityID: number): boolean {
    let chat = this._chatList.valueOf(entityID)
    if (!chat) return true

    chat.delete().then((status) => {
      if (!status) throw new Error('chat deleting error')
    })
    return this._chatList.delete(chat)
  }
}

class Chat implements Chat.Controller {
  private _id!: number

  public get id() {
    return this._id
  }

  public set id(newID: number) {
    this._id = newID
  }

  public async delete() {
    return true
  }

  constructor() {}
}
