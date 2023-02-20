import type { Match, Rating } from '../../../../Interfaces'
import { GRIFilter } from './ByGRI'
import { GuildFilter } from './ByGuild'
import { RegimeFilter } from './ByRegime'
import { RegionFilter } from './ByRegion'
import { StateFilter } from './ByStatus'
import { TeamFilter } from './ByTeam'

export class Filters implements Rating.SearchEngine.Filters {
  private _filtersCount: { [key: string]: number } = {}
  private _filters: Array<Rating.SearchEngine.Filter> = new Array()

  constructor() {
    this._addFilter(new StateFilter())
  }
  byGRI(GRI: number) {
    let filter = new GRIFilter()
    filter.GRI = GRI

    this._addFilter(filter)
    return this
  }

  byRegion(region: Rating.SearchEngine.SUPPORTED_REGIONS) {
    let filter = new RegionFilter()
    filter.region = region

    this._addFilter(filter)
    return this
  }

  byTeam(id: Match.Player.Team.ID) {
    let filter = new TeamFilter()
    filter.id = id

    this._addFilter(filter)
    return this
  }

  byGuild() {
    this._addFilter(new GuildFilter())
    return this
  }

  byRegime(type: Match.Lobby.Type): Rating.SearchEngine.Filters {
    let filter = new RegimeFilter()
    filter.lobbyType = type

    this._addFilter(filter)
    return this
  }

  get values() {
    return this._filters
  }

  get count() {
    return this._filtersCount
  }

  use(lobby: Match.Lobby.Instance) {
    let results: { [key: string]: number } = {}
    for (let filter of this._filters) {
      if (!filter.isValid(lobby)) continue
      if (results[filter.priority] == undefined) results[filter.priority] = 0
      if (typeof results[filter.priority] == 'number')
        results[filter.priority]++
    }

    return results
  }

  /**
   * Обновляет счетчик фильтров, который необходим для последующей проверки. <br>
   * Формат:
   *
   * ```ts
   *  {
   *    required: number
   *    optional: number
   *  }
   * ```
   *
   *
   * @param newFilter
   * @returns
   */
  private _addFilter(newFilter: Rating.SearchEngine.Filter) {
    this._filters.push(newFilter)

    if (!this._filtersCount[newFilter.priority]) {
      this._filtersCount[newFilter.priority] = 1
      return
    }

    this._filtersCount[newFilter.priority]++
  }
}
