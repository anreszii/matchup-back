import type { Match, Rating } from '../../../../Interfaces/index'

export class StatusFilter implements Rating.SearchEngine.Filter {
  isValid(lobby: Match.Lobby.Instance) {
    return lobby.status == 'searching'
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
