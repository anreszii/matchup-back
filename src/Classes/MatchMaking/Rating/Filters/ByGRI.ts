import type { Match, Rating } from '../../../../Interfaces/index'
import { Logger } from '../../../../Utils/Logger'
import { inRange, getRounded } from '../../../../Utils/math'
const DEFAULT_MPR_SPREAD = 200
export class GRIFilter implements Rating.SearchEngine.Filter {
  private _GRI: number = 0
  private _logger = new Logger('Search Engine', 'GRI Filter')
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    const filterResult = inRange(
      getRounded(this._GRI, 100),
      getRounded(lobby.GRI, 100),
      DEFAULT_MPR_SPREAD,
    )
    this._logger.trace(
      `LOBBY: ${lobby.GRI}; REQUIRED GRI: ${this._GRI}; RESULT: ${filterResult};`,
    )
    return filterResult
  }

  set GRI(value: number) {
    if (value > -1) this._GRI = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }

  get type(): Rating.SearchEngine.FILTER_TYPE {
    return 'GRI'
  }

  get value(): unknown {
    return this._GRI
  }
}
