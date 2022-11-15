import type { Match, Rating } from '../../../../Interfaces/index'

export class RegionFilter implements Rating.SearchEngine.Filter {
  private _region: Rating.SearchEngine.SUPPORTED_REGIONS = 'Europe'
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    return lobby.region == this._region
  }

  set region(value: Rating.SearchEngine.SUPPORTED_REGIONS) {
    this._region = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }

  get type(): Rating.SearchEngine.FILTER_TYPE {
    return 'REGION'
  }

  get value(): unknown {
    return this._region
  }
}
