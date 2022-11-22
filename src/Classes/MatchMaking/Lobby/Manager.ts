import type { Match } from '../../../Interfaces'
import { DiscordClient } from '../../Discord/Client'

import { v4 as uuid } from 'uuid'
import { Lobby } from './Lobby'
import { TechnicalCause, TechnicalError } from '../../../error'
import { DiscordRoleManager } from '../../Discord/RoleManager'

export class LobbyManager implements Match.Manager.Instance {
  private static _counter: Match.Lobby.Counter = {
    searching: 0,
    playing: 0,
  }
  private _lobbyMap: Map<string, Match.Lobby.Instance> = new Map()
  private _controller: Match.Controller
  constructor(controller: Match.Controller, private _dsClient: DiscordClient) {
    this._controller = controller
  }

  public spawn(type: Match.Lobby.Type = 'rating'): Match.Lobby.Instance {
    const ID = LobbyManager._createID()
    this._dsClient.guildWithFreeChannelsForVoice.then(async (guild) => {
      if (!guild) return
      await DiscordRoleManager.createTeamRole(guild, ID)
      await this._dsClient.createChannelsForMatch(guild, ID)
    })
    this._controller.create().then((status) => {
      if (!status)
        throw new TechnicalError('lobby', TechnicalCause.CAN_NOT_CREATE)
    })

    let lobby = new Lobby(ID, type, 2, this._controller)
    lobby.discord = this._dsClient
    lobby.counter = LobbyManager._counter

    this._lobbyMap.set(ID, lobby)
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
