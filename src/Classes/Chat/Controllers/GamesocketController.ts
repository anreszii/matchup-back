import io from 'gamesocket.io'
import { Namespace } from 'gamesocket.io/lib/Namespace/Namespace'
import type { Chat } from '../../../Interfaces'
import Aliases, { AliasMap } from '../../../tmp/plug'

let Server = io()

export class Controller implements Chat.Controller.Interface {
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

  public send(message: Chat.Message): boolean {
    this._nmsp
      .control(this._roomName)
      .emit(`chat/${this._roomName}`, message.stringFormat)
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
