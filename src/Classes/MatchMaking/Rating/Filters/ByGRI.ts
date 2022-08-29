import type { Match, Rating } from '../../../../Interfaces/index'
import { inRange } from '../../../../Utils/math'

export class ByGRIFilter implements Rating.SearchEngine.Filter {
  private _GRI: number = 0
  constructor() {}

  getResults(lobbies: Array<Match.Lobby.Instance>): Array<string> {
    let tmp: Array<string> = new Array()
    for (let index = 0; index < lobbies.length; index++) {
      if (inRange(this._GRI, lobbies[index].GRI, 100))
        tmp.push(lobbies[index].id)
    }
    return tmp
  }

  set GRI(value: number) {
    if (value > -1) this._GRI = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }
}
