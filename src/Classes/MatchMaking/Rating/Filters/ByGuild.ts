import type { Match, Rating } from '../../../../Interfaces/index'

export class GuildFilter implements Rating.SearchEngine.Filter {
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    return lobby.isForGuild
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }

  get type(): Rating.SearchEngine.FILTER_TYPE {
    return 'GUILD'
  }

  get value(): unknown {
    return
  }
}
