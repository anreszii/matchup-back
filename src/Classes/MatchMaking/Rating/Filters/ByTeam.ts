import type { Match, Rating } from '../../../../Interfaces/index'

export class ByTeamFilter implements Rating.SearchEngine.Filter {
  private _teamSize: number = 1
  constructor() {}

  getResults(lobbies: Array<Match.Lobby.Instance>): Array<string> {
    let tmp: Array<string> = new Array()
    for (let index = 0; index < lobbies.length; index++)
      if (lobbies[index].hasSpace(this._teamSize)) tmp.push(lobbies[index].id)

    return tmp
  }

  set teamSize(value: number) {
    if (value > 0 && value <= 5) this._teamSize = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }
}
