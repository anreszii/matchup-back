import type { Match } from '../../../Interfaces'

import { v4 as uuid } from 'uuid'
import { Lobby } from './Lobby'
import { TechnicalCause, TechnicalError } from '../../../error'
import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { CLIENT_CHATS } from '../../Chat/Manager'
import { Logger } from '../../../Utils/Logger'

export class LobbyManager implements Match.Manager.Instance {
  private static _counter: Match.Lobby.Counter = {
    searching: 0,
    playing: 0,
  }
  private _lobbyMap: Map<string, Match.Lobby.Instance> = new Map()
  private _controller: Match.Controller
  private _logger = new Logger('Lobby Manager')
  constructor(controller: Match.Controller) {
    this._controller = controller
    //TODO автоудаление лобби, если там нет участников
    setInterval(
      function (this: LobbyManager) {
        this._logger.info('CLEANING GARBAGE')
        for (let lobby of this._lobbyMap.values()) {
          if (lobby.readyToDrop) this.drop(lobby)
          if (lobby.state == 'searching' && lobby.members.count == 0)
            lobby.markToDelete()
        }
      }.bind(this),
      MINUTE_IN_MS * 5,
    )
  }

  async spawn(
    type: Match.Lobby.Type = 'rating',
  ): Promise<Match.Lobby.Instance> {
    const ID = LobbyManager._createID()
    let status = await this._controller.create()
    if (!status)
      throw new TechnicalError('lobby', TechnicalCause.CAN_NOT_CREATE)

    let lobby = new Lobby(
      ID,
      type,
      5,
      this._controller,
      await CLIENT_CHATS.spawn('lobby', `lobby#${ID}`),
    )
    lobby.counter = LobbyManager._counter

    this._lobbyMap.set(ID, lobby)
    this._logger.info(`SPAWNED LOBBY#${lobby.id}`)
    return lobby
  }

  async getFreeLobby(lobbyID?: string): Promise<Match.Lobby.Instance> {
    if (lobbyID && this._lobbyMap.has(lobbyID))
      return this._lobbyMap.get(lobbyID)!

    let notFilledLobby = this._findFreeLobby()

    if (notFilledLobby) return notFilledLobby
    return this.spawn()
  }

  get(lobbyID: string) {
    return this._lobbyMap.get(lobbyID)
  }

  has(lobbyID: string) {
    return this._lobbyMap.has(lobbyID)
  }

  drop(lobby: string | Match.Lobby.Instance): boolean {
    this._logger.info(`DROPPED LOBBY: ${JSON.stringify(lobby)}`)
    if (typeof lobby == 'string') return this._lobbyMap.delete(lobby)
    return this._lobbyMap.delete(lobby.id)
  }

  get lobbies(): Array<Match.Lobby.Instance> {
    return [...this._lobbyMap.values()]
  }

  get counter(): Match.Lobby.Counter {
    return LobbyManager._counter
  }

  private _findFreeLobby() {
    for (let lobby of this._lobbyMap.values()) {
      if (lobby.state == 'searching' && lobby.game == this._controller.gameName)
        return lobby
      if (!lobby.state) this.drop(lobby)
    }
  }

  private static _createID() {
    return uuid()
  }
}
