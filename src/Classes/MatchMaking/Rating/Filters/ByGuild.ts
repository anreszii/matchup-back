import type { Match, Rating } from '../../../../Interfaces/index'
import { Logger } from '../../../../Utils/Logger'

export class GuildFilter implements Rating.SearchEngine.Filter {
  private _logger = new Logger('Search Engine', 'Guild Filter')
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    const filterResult = lobby.isForGuild
    this._logger.debug(`LOBBY: ${lobby.isForGuild}; RESULT: ${filterResult}`)
    return filterResult
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
