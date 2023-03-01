import { Match } from '../../../Interfaces'

import { v4 as uuid } from 'uuid'
import { Lobby } from './Lobby'
import { CLIENT_CHATS } from '../../Chat/Manager'
import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { Logger } from '../../../Utils/Logger'
import { COMMANDS } from '../Command/Manager'
import { MAX_COMMAND_SIZE } from '../../../configs/Lobby'

export class LobbyManager implements Match.Manager.Instance {
  private static _counter: Match.Lobby.Counter = {
    searching: 0,
    playing: 0,
  }
  private static _availableLobbyTypesCounter: Match.Lobby.AvailableLobbyTypesCounter =
    {
      rating: 0,
      training: 0,
      arcade: 0,
    }
  private _lobbyMap: Map<string, Match.Lobby.Instance> = new Map()
  private _logger = new Logger('Lobby Manager')
  constructor() {
    setInterval(
      function (this: LobbyManager) {
        this._logger.info('CLEANING GARBAGE')
        for (let lobby of this._lobbyMap.values())
          if (lobby.readyToDrop) this.drop(lobby)
      }.bind(this),
      MINUTE_IN_MS * 5,
    )
  }

  async spawn(
    type: Match.Lobby.Type = 'rating',
  ): Promise<Match.Lobby.Instance> {
    const ID = LobbyManager._createID()

    const commands: Map<
      Match.Lobby.Command.Types,
      Match.Lobby.Command.Instance
    > = new Map()
    const promises = await Promise.all([
      COMMANDS.spawn(ID, 'spectators', MAX_COMMAND_SIZE),
      COMMANDS.spawn(ID, 'neutrals', MAX_COMMAND_SIZE * 3),
      COMMANDS.spawn(ID, 'command1', MAX_COMMAND_SIZE),
      COMMANDS.spawn(ID, 'command2', MAX_COMMAND_SIZE),
      CLIENT_CHATS.spawn('lobby', `lobby#${ID}`),
    ]).catch((e: Error) => {
      this._logger.critical(
        `[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
      )
      throw e
    })
    commands.set('spectators', promises[0])
    commands.set('neutrals', promises[1])
    commands.set('command1', promises[2])
    commands.set('command2', promises[3])

    const lobby = new Lobby(ID, type, promises[4], commands)
    lobby.counter = LobbyManager._counter
    lobby.typeCounters = LobbyManager._availableLobbyTypesCounter

    LobbyManager._availableLobbyTypesCounter[type]++

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
    if (typeof lobby == 'string') {
      this._logger.info(`DROPPED LOBBY#${lobby}`)
      return this._lobbyMap.delete(lobby)
    }

    this._logger.info(`DROPPED LOBBY#${lobby.id}`)
    return this._lobbyMap.delete(lobby.id)
  }

  get lobbies(): Array<Match.Lobby.Instance> {
    return [...this._lobbyMap.values()]
  }

  get counter(): Match.Lobby.Counter {
    return LobbyManager._counter
  }

  get availableLobbyTypeCounters(): Match.Lobby.AvailableLobbyTypesCounter {
    return LobbyManager._availableLobbyTypesCounter
  }

  private _findFreeLobby() {
    for (let lobby of this._lobbyMap.values())
      if (lobby.state == Match.Lobby.States.searching) return lobby
  }

  private static _createID() {
    return uuid()
  }
}

export const StandOff_Lobbies = new LobbyManager()
