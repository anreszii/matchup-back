import type { Rating, Match } from '../../../Interfaces'
import { Filters } from './Filters/Filters'
import { Finder } from './Finder'

export class SearchEngine implements Rating.SearchEngine.Instance {
  constructor(private _manager: Match.Manager.Instance) {}

  findLobby(
    filters: Rating.SearchEngine.Filters,
  ): Promise<Match.Lobby.Instance> {
    let finder = new Finder(this._manager.lobbies, filters)
    return finder.find().then((result) => {
      if (!result) return this._manager.spawn()
      return result
    })
  }

  get Filters(): Rating.SearchEngine.Filters {
    return new Filters()
  }
}
