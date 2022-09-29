import type { Match } from '../../../Interfaces'
import type { DiscordClient } from '../../Discord/Client'

import { v4 as uuid } from 'uuid'

import { matchCause, MatchError } from '../../../error'
import { Lobby } from './Lobby'

export class LobbyManager implements Match.Manager.Instance {
  private _lobbyMap: Map<string, Match.Lobby.Instance> = new Map()
  private _controller: Match.Controller
  constructor(controller: Match.Controller, private _dsClient: DiscordClient) {
    this._controller = controller
  }

  public spawn(): Match.Lobby.Instance {
    const ID = LobbyManager._createID()
    this._dsClient.guildWithFreeChannelsForVoice.then((guild) => {
      if (!guild) return
      this._dsClient.createChannelsForMatch(guild, ID)
    })
    this._controller.create().then((status) => {
      if (!status) throw new MatchError('lobby', matchCause.CREATE)
    })

    let lobby = new Lobby(ID, this._controller)
    this._lobbyMap.set(ID, lobby)
    lobby.dsClient = this._dsClient

    return lobby
  }

  public getFreeLobby(lobbyID?: string): Match.Lobby.Instance {
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

  public drop(lobby: string | Match.Lobby.Instance): boolean {
    if (typeof lobby == 'string') return this._lobbyMap.delete(lobby)
    return this._lobbyMap.delete(lobby.id)
  }

  public get lobbies(): Array<Match.Lobby.Instance> {
    return [...this._lobbyMap.values()]
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
