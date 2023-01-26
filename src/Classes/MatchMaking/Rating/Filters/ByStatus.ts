import type { Match, Rating } from '../../../../Interfaces/index'

export class StateFilter implements Rating.SearchEngine.Filter {
  isValid(lobby: Match.Lobby.Instance) {
    return lobby.state == 'searching'
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
