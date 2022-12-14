import type { Match, Rating } from '../../../../Interfaces/index'
import { TEAMS } from '../../Team/Manager'

export class TeamFilter implements Rating.SearchEngine.Filter {
  private _ID!: number
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    return lobby.canAddTeam(this._ID)
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
