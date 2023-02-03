import type { Match, Rating } from '../../../../Interfaces/index'
import { Logger } from '../../../../Utils/Logger'
import { TEAMS } from '../../Team/Manager'

export class TeamFilter implements Rating.SearchEngine.Filter {
  private _logger = new Logger('Search Engine', 'Team Filter')
  private _ID!: number
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    const filterResult = lobby.canAddTeam(this._ID)
    this._logger.trace(
      `LOBBY: ${JSON.stringify(lobby)}; RESULT: ${filterResult}; TEAM ID: ${
        this._ID
      }`,
    )
    return filterResult
  }

  set id(value: number) {
    if (TEAMS.get(value)) this._ID = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }

  get type(): Rating.SearchEngine.FILTER_TYPE {
    return 'TEAM'
  }

  get value(): unknown {
    return this._ID
  }
}
