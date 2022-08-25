import io, { Namespace } from 'gamesocket.io'
import type { Chat } from '../../../Interfaces'
import Aliases, { AliasMap } from '../../../tmp/plug'

let Server = io()

export class Gamesocket implements Chat.Controller.Instance {
  private _map!: AliasMap
  private _nmsp!: Namespace
  private _roomName!: string
  constructor(nmsp?: string) {
    if (nmsp) {
      this._map = Aliases.get(nmsp)
      this._nmsp = Server.of(nmsp)
    }
  }

  public async delete(executor: Chat.Member): Promise<boolean> {
    return true
  }

  public addMember(member: Chat.Member): boolean {
    let IDs = this._map.get(member.name)
    if (!IDs) return false

    this._nmsp.control(this._roomName).join(IDs)
    return true
  }

  public deleteMember(member: Chat.Member): boolean {
    let IDs = this._map.get(member.name)
    if (!IDs) return false

    this._nmsp.control(this._roomName).leave(IDs)
    return true
  }

  /**
   * отправляет сообщение формата:
   
 * ```json
 * {
 *  "chat_id": "xxxxxx",
 *  "message": 
 *  {
 *    "from": "system or username",
 *    "message": "text of message"
 *  }
 * }
 * ```
   * @event
   */
  public send(message: string): boolean {
    this._nmsp
      .control(this._roomName)
      .emit(`lobby_chat`, { chat_id: this._roomName, message })
    return true
  }

  set namespace(value: string) {
    this._map = Aliases.get(value)
    this._nmsp = Server.of(value)
  }

  set roomName(value: string) {
    this._roomName = value
  }
}