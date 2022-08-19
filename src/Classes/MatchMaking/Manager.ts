import type { Match } from '../../Interfaces'

import { v4 as uuid } from 'uuid'

import { matchCause, MatchError } from '../../error'
import { Lobby } from './Lobby'

export class LobbyManager implements Match.Manager.Interface {
  private _lobbyMap: Map<string, Match.Lobby.Interface> = new Map()
  private _controller: Match.Controller
  constructor(controller: Match.Controller) {
    this._controller = controller
  }

  public spawn(): Match.Lobby.Interface {
    const ID = LobbyManager._createID()
    this._controller.create().then((status) => {
      if (!status) throw new MatchError('lobby', matchCause.CREATE)
    })

    let lobby = new Lobby(this._controller, ID)
    this._lobbyMap.set(ID, lobby)

    return lobby
  }

  public getFreeLobby(lobbyID?: string): Match.Lobby.Interface {
    if (lobbyID && this._lobbyMap.has(lobbyID))
      return this._lobbyMap.get(lobbyID)!

    let notFilledLobby = this._findFreeLobby()

    if (notFilledLobby) return notFilledLobby
    return this.spawn()
  }

  public get(lobbyID: string) {
    return this._lobbyMap.get(lobbyID)
  }

  public has(lobbyID: string) {
    return this._lobbyMap.has(lobbyID)
  }

  public drop(lobbyID: string | Match.Lobby.Interface): boolean {
    if (typeof lobbyID == 'string') return this._lobbyMap.delete(lobbyID)
    return this._lobbyMap.delete(lobbyID.id)
  }

  private _findFreeLobby() {
    for (let lobby of this._lobbyMap.values()) {
      if (
        lobby.status == 'searching' &&
        lobby.game == this._controller.gameName
      )
        return lobby
      if (!lobby.status) this.drop(lobby)
    }
  }

  private static _createID() {
    return uuid()
  }
}
