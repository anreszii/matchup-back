import { PlayerStates } from '../../../Interfaces/MatchMaking/Player'
import type { Match } from '../../../Interfaces'
import { Logger } from '../../../Utils/Logger'
import { SECOND_IN_MS } from '../../../configs/time_constants'
import { Player } from './Player'
import { Types } from 'mongoose'

export class PlayerManager implements Match.Player.Manager {
  private _players: Map<Match.Player.ID, Match.Player.Instance> = new Map()
  private _nameAndIdMap: Map<Match.Player.Name, Match.Player.ID> = new Map()
  private _logger = new Logger('Player', 'Manager')
  constructor() {
    setInterval(this._updatePlayers.bind(this), SECOND_IN_MS * 30)
  }

  async spawn(name: Match.Player.Name): Promise<Match.Player.Instance> {
    if (this.has(name)) return this.get(name)!
    try {
      const player = new Player(name)
      await player.waitForState(PlayerStates.online)

      this._players.set(player.id, player)
      this._nameAndIdMap.set(player.data.name, player.id)

      return player
    } catch (e) {
      if (e instanceof Error)
        this._logger.fatal(
          `[ERRORR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
        )
      throw e
    }
  }

  has(entity: Match.Player.ID | Match.Player.Name): boolean {
    if (Types.ObjectId.isValid(entity)) return this._players.has(entity)
    return this._hasPlayerWithName(entity)
  }

  get(
    entity: Match.Player.ID | Match.Player.Name,
  ): Match.Player.Instance | undefined {
    const player = Types.ObjectId.isValid(entity)
      ? this._players.get(entity)
      : this._getByName(entity)
    return player
  }

  drop(entity: Match.Player.ID | Match.Player.Name): boolean {
    if (!this.has(entity)) return false
    const player = this.get(entity)!

    this._players.delete(player.id)
    this._nameAndIdMap.delete(player.data.name)
    return true
  }

  isOnline(names: Match.Player.Name[]): Map<string, boolean> {
    const nameAndStatusMap = new Map()
    for (let name of names) {
      if (this.get(name)?.state == PlayerStates.online)
        nameAndStatusMap.set(name, true)
      else nameAndStatusMap.set(name, false)
    }

    return nameAndStatusMap
  }

  private _hasPlayerWithName(name: string): boolean {
    return this._nameAndIdMap.has(name)
  }

  private _getByName(name: string): Match.Player.Instance | undefined {
    if (!this._hasPlayerWithName(name)) return
    return this._players.get(this._nameAndIdMap.get(name)!)
  }

  private async _updatePlayers() {
    this._logger.trace('start updating players data')
    const promises = []
    for (let player of this._players.values()) {
      if (player.state == PlayerStates.deleted) this.drop(player.id)
      else promises.push(player.update())
    }

    await Promise.all(promises)
    this._logger.trace('end updating players data')
  }
}

export const PLAYERS = new PlayerManager()
