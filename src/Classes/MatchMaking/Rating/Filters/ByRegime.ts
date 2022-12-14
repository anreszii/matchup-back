import type { Match, Rating } from '../../../../Interfaces/index'

export class RegimeFilter implements Rating.SearchEngine.Filter {
  private _type: Match.Lobby.Type = 'rating'
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    return lobby.type == this._type
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
