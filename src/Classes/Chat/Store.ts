import { WebSocket } from 'uWebSockets.js'
import { CLIENT_CHATS } from './Manager'

type Name = string
export class ChatStore {
  static _chats: Map<string, Set<string>> = new Map()

  static add(member: Name, id: string) {
    if (ChatStore._chats.has(member))
      return ChatStore._chats.get(member)!.add(id)
    const set = new Set([id])
    ChatStore._chats.set(member, set)
  }

  static delete(member: Name, id: string) {
    if (!ChatStore._chats.has(member)) return false
    else return ChatStore._chats.get(member)!.delete(id)
  }

  static joinChats(member: Name) {
    const chats = ChatStore._chats.get(member)
    if (!chats) return

    const promises = []
    for (let id of chats) {
      promises.push(
        CLIENT_CHATS.get(id).then((chat) => {
          chat.forceJoin(member)
        }),
      )
    }
    return Promise.all(promises).then(() => true)
  }

  static get(member: Name) {
    return ChatStore._chats.get(member)
  }

  static drop(member: Name) {
    return ChatStore._chats.delete(member)
  }
}
