import type { Match, Rating } from '../../../../Interfaces/index'

export class ByGuildFilter implements Rating.SearchEngine.Filter {
  constructor() {}

  getResults(lobbies: Array<Match.Lobby.Instance>): Array<string> {
    let tmp: Array<string> = new Array()
    for (let index = 0; index < lobbies.length; index++)
      if (lobbies[index].isForGuild) tmp.push(lobbies[index].id)

    return tmp
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }
}
