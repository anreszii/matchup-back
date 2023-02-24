import type { Rating, Match } from '../../../Interfaces'
import {
  PlayerSignals,
  PlayerStates,
} from '../../../Interfaces/MatchMaking/Player'
import { Logger } from '../../../Utils/Logger'
import { TechnicalCause, TechnicalError } from '../../../error'
import { TEAMS } from '../Team/Manager'
import { Filters } from './Filters/Filters'
import { Finder } from './Finder'

export class SearchEngine implements Rating.SearchEngine.Instance {
  private _logger = new Logger('Search Engine')
  constructor(private _manager: Match.Manager.Instance) {}

  findLobby(
    filters: Rating.SearchEngine.Filters,
    player: Match.Player.Instance,
  ): Promise<Match.Lobby.Instance> {
    if (player.state >= PlayerStates.waiting)
      throw new TechnicalError('lobby', TechnicalCause.ALREADY_EXIST)
    this._startSearchingForPlayer(player)
    this._logger.trace(`STARTED. FILTERS: ${JSON.stringify(filters)}`)
    let finder = new Finder(this._manager.lobbies, filters)
    return finder
      .find()
      .then((foundedLobby) => {
        if (foundedLobby) {
          this._logger.info(`LOBBY FOUNDED: ${foundedLobby.id}`)
          this._logger.trace(
            `FOUNDED LOBBY DATA: ${JSON.stringify(foundedLobby)}`,
          )
          return foundedLobby
        }
        for (let filter of filters.values)
          if (filter.type == 'REGIME') {
            this._logger.info(`SPAWNING LOBBY WITH CUSTOM REGIME TYPE`)
            return this._manager.spawn(filter.value as string)
          }
        this._logger.info(`SPAWNING CUSTOM LOBBY`)
        return this._manager.spawn()
      })
      .catch((e) => {
        if (e instanceof Error)
          this._logger.critical(
            `[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
          )
        throw e
      })
  }

  get Filters(): Rating.SearchEngine.Filters {
    return new Filters()
  }

  private _startSearchingForPlayer(player: Match.Player.Instance) {
    if (player.state >= PlayerStates.searching)
      throw new TechnicalError(
        'member search flag',
        TechnicalCause.ALREADY_EXIST,
      )
    if (!player.PublicData.teamID) return player.event(PlayerSignals.search)
    let team = TEAMS.findById(player.PublicData.teamID)
    if (!team) return player.event(PlayerSignals.corrupt)
    for (let player of team.players.values()) player.event(PlayerSignals.search)
  }
}
