import type { Match, Rating } from '../../../../Interfaces/index'
import { inRange } from '../../../../Utils/math'

export class GRIFilter implements Rating.SearchEngine.Filter {
  private _GRI: number = 0
  constructor() {}

  isValid(lobby: Match.Lobby.Instance) {
    return inRange(this._GRI, lobby.GRI, 100)
  }

  set GRI(value: number) {
    if (value > -1) this._GRI = value
  }

  get priority(): Rating.SearchEngine.FILTER_PRIORITY {
    return 'required'
  }

  get type(): Rating.SearchEngine.FILTER_TYPE {
    return 'GRI'
  }

  get value(): unknown {
    return this._GRI
  }
}
