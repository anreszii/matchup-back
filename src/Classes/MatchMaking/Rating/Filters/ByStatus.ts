import type { Match, Rating } from '../../../../Interfaces/index'
import { Logger } from '../../../../Utils/Logger'

export class StateFilter implements Rating.SearchEngine.Filter {
  private _logger = new Logger('Search Engine', 'State Filter')
  isValid(lobby: Match.Lobby.Instance) {
    const filterResult = lobby.state == 'searching'
    this._logger.trace(
      `LOBBY STATE: ${lobby.state}; RESULT: ${filterResult}; REQUIRED STATE: searching`,
    )
    return filterResult
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }

  get type(): Rating.SearchEngine.FILTER_TYPE {
    return 'STATUS'
  }

  get value(): unknown {
    return 'searching'
  }
}
