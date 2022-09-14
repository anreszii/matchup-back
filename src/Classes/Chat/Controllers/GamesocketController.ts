import { Namespace } from 'gamesocket.io'
import { WS_SERVER } from '../../../app'
import type { Chat } from '../../../Interfaces'
import Aliases, { AliasMap } from '../../../tmp/plug'

module.exports = class Gamesocket implements Chat.Controller.Instance {
  private _map!: AliasMap
  private _nmsp!: Namespace
  private _roomName!: string
  constructor(nmsp?: string) {
    if (nmsp) {
      this._map = Aliases.get(nmsp)
      this._nmsp = WS_SERVER.of(nmsp)
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
   * отправляет сообщение формата на ивент chat:
   
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
      .emit(`chat`, { chat_id: this._roomName, message })
    return true
  }

  set namespace(value: string) {
    this._map = Aliases.get(value)
    this._nmsp = WS_SERVER.of(value)
  }

  set roomName(value: string) {
    this._roomName = value
  }
}
