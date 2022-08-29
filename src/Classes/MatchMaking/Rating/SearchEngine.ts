import { Rating, Match } from '../../../Interfaces'
import { inRange } from '../../../Utils/math'
import { ByGRIFilter, ByRegionFilter, ByTeamFilter } from './Filters'

/**
 * @TODO
 * Разделить на классы поиска и фильтрации
 */
export class MatchFinder implements Rating.SearchEngine.Instance {
  private _intervals: Array<NodeJS.Timer> = new Array()
  private _searchZone: Rating.SearchEngine.SEARCH_ZONE = 0
  private _filtersCount: { [key: string]: number } = {}
  private _filters: Array<Rating.SearchEngine.Filter> = new Array()
  private _results: Map<string, { [key: string]: number }> = new Map()
  private _maxWaitingTime: number = 1000 * 60 * 2
  private _lobbies: Array<Match.Lobby.Instance> = new Array()

  constructor(private _manager: Match.Manager.Instance) {
    this._intervals.push(setInterval(this._updateLobbies, 1000 * 2.5))
    this._intervals.push(setInterval(this._clear, 1000))
  }

  public filterByGRI(GRI: number) {
    let filter = new ByGRIFilter()
    filter.GRI = GRI

    this._addFilter(filter)
    return this
  }

  public filterByRegion(region: Rating.SearchEngine.SUPPORTED_REGIONS) {
    let filter = new ByRegionFilter()
    filter.region = region

    this._addFilter(filter)
    return this
  }

  public filterByTeamSize(size: number) {
    let filter = new ByTeamFilter()
    filter.teamSize = size
    this._addFilter(filter)

    return this
  }

  public async findLobby(): Promise<Match.Lobby.Instance> {
    //каждые 30 секунд расширяет фильтр поиска, пока он не будет максимальным
    var ID = setInterval(() => {
      if (this._searchZone == Rating.SearchEngine.SEARCH_ZONE.large)
        clearInterval(ID)
      this._extendSearch()
    }, 1000 * 30)

    this._intervals.push(ID)
    this._intervals.push(
      setInterval(() => {
        for (let filter of this._filters) {
          let priority = filter.priority
          let tmp = filter.getResults(this._lobbies)
          for (let lobbyID of tmp) {
            this._addPoint(lobbyID, priority)
          }
        }
      }, 1000),
    )

    let searchStartTimeInMs = Date.now()
    while (Date.now() - searchStartTimeInMs < this._maxWaitingTime) {
      switch (this._searchZone) {
        case 0: {
          let lobby = this._searchInSmallZone()
          if (lobby) {
            this.delete()
            return lobby
          }
          break
        }
        case 1: {
          let lobby = this._searchInMediumZone()
          if (lobby) {
            this.delete()
            return lobby
          }
          break
        }
        case 2: {
          let lobby = this._searchInLargeZone()
          if (lobby) {
            this.delete()
            return lobby
          }
          break
        }
      }
    }

    this.delete()
    return this._manager.spawn()
  }

  /**
   *
   * @param ms максимальное время поиска в секундах. Если за это время не найдет лобби - поиск прекратиться. <br> стандартное время поиска - 2 минуты
   * @returns
   */
  public setMaxWaitingTime(ms: number): MatchFinder {
    this._maxWaitingTime = ms
    return this
  }

  public delete(): void {
    for (let id of this._intervals) {
      clearInterval(id)
    }
  }

  private _extendSearch() {
    if (this._searchZone < 3) this._searchZone++
  }

  private _addFilter(newFilter: Rating.SearchEngine.Filter) {
    this._filters.push(newFilter)

    if (!this._filtersCount[newFilter.priority]) {
      this._filtersCount[newFilter.priority] = 1
      return
    }

    this._filtersCount[newFilter.priority]++
  }

  private _addPoint(
    lobbyID: string,
    priority: Rating.SearchEngine.FILTER_PRIORITY,
  ) {
    if (this._results.has(lobbyID)) {
      let lobbyResult = this._results.get(lobbyID)!
      if (!lobbyResult[priority]) lobbyResult[priority] = 1
      else lobbyResult[priority]++

      return
    }

    let tmp: { [key: string]: number } = {}
    tmp[priority] = 1

    this._results.set(lobbyID, tmp)
  }

  private _clear() {
    for (let key of this._results.keys()) {
      this._results.delete(key)
    }
  }

  private _updateLobbies() {
    this._lobbies = this._manager.lobbies
  }

  private _searchInSmallZone() {
    for (let [lobbyID, filterResults] of this._results) {
      if (filterResults['required'] != this._filtersCount['required']) break
      if (
        !inRange(filterResults['optional'], this._filtersCount['optional'], 1)
      )
        break
      return this._manager.get(lobbyID)
    }
  }

  private _searchInMediumZone() {
    for (let [lobbyID, filterResults] of this._results) {
      if (filterResults['required'] != this._filtersCount['required']) break
      if (
        !inRange(filterResults['optional'], this._filtersCount['optional'], 3)
      )
        break
      return this._manager.get(lobbyID)
    }
  }

  private _searchInLargeZone() {
    for (let [lobbyID, filterResults] of this._results) {
      if (filterResults['required'] != this._filtersCount['required']) break
      return this._manager.get(lobbyID)
    }
  }
}
