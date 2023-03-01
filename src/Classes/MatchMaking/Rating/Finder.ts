import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { Match, Rating } from '../../../Interfaces/index'
import { inRange } from '../../../Utils/math'
import { sleep } from '../../../Utils/sleep'

export class Finder implements Rating.SearchEngine.Finder {
  private _searchZone: Rating.SearchEngine.SEARCH_ZONE = 0
  private _maxWaitingTime: number = MINUTE_IN_MS * 2

  constructor(
    private _lobbies: Match.Lobby.Instance[],
    private _filters: Rating.SearchEngine.Filters,
    private _counters: Match.Lobby.AvailableLobbyTypesCounter,
  ) {}
  async find() {
    const STARTED_AT = new Date()
    const Timer = setInterval(
      this._extendSearch.bind(this),
      this._maxWaitingTime / 3,
    )
    let regime
    for (let filter of this._filters.values)
      if (filter.type == 'REGIME') regime = filter.value
    if (
      this._lobbies.length == 0 ||
      this._counters[regime as Match.Lobby.Type] === 0
    ) {
      clearInterval(Timer)
      return null
    }
    while (Date.now() - STARTED_AT.getTime() < this._maxWaitingTime) {
      switch (this._searchZone) {
        case 0:
          let lobby = this._searchInSmallZone()
          if (lobby) {
            clearInterval(Timer)
            return lobby
          }
          break

        case 1:
          lobby = this._searchInMediumZone()
          if (lobby) {
            clearInterval(Timer)
            return lobby
          }
          break

        case 2:
          lobby = this._searchInLargeZone()
          if (lobby) {
            clearInterval(Timer)
            return lobby
          }
          break
      }

      await sleep(100)
    }

    clearInterval(Timer)
    return null
  }

  private _searchInSmallZone() {
    for (let lobby of this._lobbies) {
      let result = this._filters.use(lobby)
      if (
        result['required'] == this._filters.count['required'] &&
        inRange(result['optional'], this._filters.count['optional'], 1)
      )
        return lobby
    }
  }

  private _searchInMediumZone() {
    for (let lobby of this._lobbies) {
      let result = this._filters.use(lobby)
      if (
        result['required'] == this._filters.count['required'] &&
        inRange(result['optional'], this._filters.count['optional'], 3)
      )
        return lobby
    }
  }

  private _searchInLargeZone() {
    for (let lobby of this._lobbies) {
      let result = this._filters.use(lobby)
      if (result['required'] == this._filters.count['required']) return lobby
    }
  }

  private _extendSearch() {
    if (this._searchZone < 3) this._searchZone++
  }
}
