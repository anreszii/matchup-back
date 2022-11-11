import { Namespace } from 'gamesocket.io'
import { clientServer } from '../../API/Sockets/clientSocketServer'
import { IChat } from '../../Interfaces/index'
import { ChatModel } from '../../Models/index'
import { Chat } from './Chat'

class ChatManager implements IChat.Manager {
  private _chats: Map<string, Chat> = new Map()
  constructor(private _namespace: Namespace) {}
  async spawn(type: IChat.Type, id: string): Promise<IChat.Controller> {
    const document = await ChatModel.spawn(type, id)
    const chat = new Chat(document, this._namespace)

    this._chats.set(chat.id, chat)
    return chat
  }

  async get(ID: string): Promise<IChat.Controller> {
    if (this._chats.has(ID)) return this._chats.get(ID)!

    return this._getFromDocuments(ID)
  }

  has(ID: string): boolean {
    return this._chats.has(ID)
  }

  async drop(ID: string): Promise<boolean> {
    let chat = await this.get(ID)
    return chat.delete()
  }

  private async _getFromDocuments(ID: string) {
    const document = await ChatModel.get(ID)
    const chat = new Chat(document, this._namespace)

    this._chats.set(chat.id, chat)
    return chat
  }
}

export const CLIENT_CHATS = new ChatManager(clientServer)
