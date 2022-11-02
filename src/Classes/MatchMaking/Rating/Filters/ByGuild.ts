import type { Match, Rating } from '../../../../Interfaces/index'

export class GuildFilter implements Rating.SearchEngine.Filter {
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    return lobby.isForGuild
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }
}
