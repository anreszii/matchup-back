import type { Match, Rating } from '../../../../Interfaces/index'
import { Logger } from '../../../../Utils/Logger'

export class RegimeFilter implements Rating.SearchEngine.Filter {
  private _logger = new Logger('Search Engine', 'Regime Filter')
  private _type: Match.Lobby.Type = 'rating'
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    const filterResult = lobby.type == this._type
    this._logger.trace(
      `LOBBY: ${JSON.stringify(
        lobby,
      )}; RESULT: ${filterResult}; REQUIRED REGIME: ${this._type}`,
    )
    return filterResult
  }

  set lobbyType(value: Match.Lobby.Type) {
    this._type = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }

  get type(): Rating.SearchEngine.FILTER_TYPE {
    return 'REGIME'
  }

  get value() {
    return this._type
  }
}
