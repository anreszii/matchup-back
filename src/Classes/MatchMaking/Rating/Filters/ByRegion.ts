import type { Match, Rating } from '../../../../Interfaces/index'
import { Logger } from '../../../../Utils/Logger'

export class RegionFilter implements Rating.SearchEngine.Filter {
  private _logger = new Logger('Search Engine', 'Region Filter')
  private _region: Rating.SearchEngine.SUPPORTED_REGIONS = 'Europe'
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    const filterResult = lobby.region == this._region
    this._logger.trace(
      `LOBBY: ${JSON.stringify(
        lobby,
      )}; RESULT: ${filterResult}; REQUIRED REGION: ${this._region}`,
    )
    return filterResult
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
