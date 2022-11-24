import type { Rating, Match } from '../../../Interfaces'
import { Filters } from './Filters/Filters'
import { Finder } from './Finder'

export class SearchEngine implements Rating.SearchEngine.Instance {
  constructor(private _manager: Match.Manager.Instance) {}

  async findLobby(
    filters: Rating.SearchEngine.Filters,
  ): Promise<Match.Lobby.Instance> {
    let finder = new Finder(this._manager.lobbies, filters)
    const result_1 = await finder.find()
    if (result_1) return result_1
    for (let filter of filters.values)
      if (filter.type == 'REGIME')
        return this._manager.spawn(filter.value as string)
    return this._manager.spawn()
  }

  get Filters(): Rating.SearchEngine.Filters {
    return new Filters()
  }
}
