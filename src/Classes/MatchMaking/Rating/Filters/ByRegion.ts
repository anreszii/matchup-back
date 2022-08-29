import type { Match, Rating } from '../../../../Interfaces/index'

export class ByRegionFilter implements Rating.SearchEngine.Filter {
  private _region: Rating.SearchEngine.SUPPORTED_REGIONS = 'Europe'
  constructor() {}

  getResults(lobbies: Array<Match.Lobby.Instance>): Array<string> {
    let tmp: Array<string> = new Array()
    for (let index = 0; index < lobbies.length; index++)
      if (lobbies[index].region == this._region) tmp.push(lobbies[index].id)

    return tmp
  }

  set region(value: Rating.SearchEngine.SUPPORTED_REGIONS) {
    this.region = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }
}
