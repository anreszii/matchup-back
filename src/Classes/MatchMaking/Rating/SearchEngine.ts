import type { Rating, Match } from '../../../Interfaces'
import { Logger } from '../../../Utils/Logger'
import { Filters } from './Filters/Filters'
import { Finder } from './Finder'

export class SearchEngine implements Rating.SearchEngine.Instance {
  private _logger = new Logger('Search Engine')
  constructor(private _manager: Match.Manager.Instance) {}

  async findLobby(
    filters: Rating.SearchEngine.Filters,
  ): Promise<Match.Lobby.Instance> {
    this._logger.trace(`STARTED. FILTERS: ${JSON.stringify(filters)}`)
    let finder = new Finder(this._manager.lobbies, filters)
    const findedLobby = await finder.find()
    if (findedLobby) {
      this._logger.info(`LOBBY FOUNDED: ${JSON.stringify(findedLobby)}`)
      this._logger.trace(`FOUNDED LOBBY DATA: ${JSON.stringify(findedLobby)}`)
      return findedLobby
    }
    for (let filter of filters.values)
      if (filter.type == 'REGIME') {
        this._logger.info(`SPAWNING LOBBY WITH CUSTOM REGIME TYPE`)
        return this._manager.spawn(filter.value as string)
      }
    this._logger.info(`SPAWNING CUSTOM LOBBY`)
    return this._manager.spawn()
  }

  get Filters(): Rating.SearchEngine.Filters {
    return new Filters()
  }
}
