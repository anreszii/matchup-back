import type { Rating, Match } from '../../../Interfaces'
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
    member: Match.Player.Instance,
  ): Promise<Match.Lobby.Instance> {
    if (member.lobbyID) {
      if (this._manager.has(member.lobbyID))
        return new Promise((resolve) =>
          resolve(this._manager.get(member.lobbyID!) as Match.Lobby.Instance),
        )
    }
    this._startSearchingForMember(member)
    this._logger.trace(`STARTED. FILTERS: ${JSON.stringify(filters)}`)
    let finder = new Finder(this._manager.lobbies, filters)
    const lobby = finder
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
      .finally(() => {
        this._stopSearchingForMember(member)
      })

    return lobby
  }

  get Filters(): Rating.SearchEngine.Filters {
    return new Filters()
  }

  private _startSearchingForMember(member: Match.Player.Instance) {
    if (member.flags.searching)
      throw new TechnicalError(
        'member search flag',
        TechnicalCause.ALREADY_EXIST,
      )
    member.flags.searching = true
    if (!member.teamID) return
    let team = TEAMS.findById(member.teamID)
    if (!team) return (member.teamID = undefined)
    for (let member of team.members.toArray) member.flags.searching = true
  }

  private _stopSearchingForMember(member: Match.Player.Instance) {
    member.flags.searching = false
    if (!member.teamID) return
    let team = TEAMS.findById(member.teamID)
    if (!team) return (member.teamID = undefined)
    for (let member of team.members.toArray) member.flags.searching = false
  }
}
