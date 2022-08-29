import { Match } from '../index'
import type { RatingCalculator } from './Calculator'
import type { MatchFinder } from './SearchEngine'

export declare namespace Rating {
  namespace Calculator {
    interface Instance extends RatingCalculator {}
  }
  namespace SearchEngine {
    interface Instance extends MatchFinder {}
    type SUPPORTED_REGIONS = 'Europe' | 'Asia'

    const enum SEARCH_ZONE {
      'small' = 0,
      'medium' = 1,
      'large' = 2,
    }

    type FILTER_PRIORITY = 'optional' | 'required'

    interface Filter {
      getResults(lobbies: Array<Match.Lobby.Instance>): Array<string>
      get priority(): FILTER_PRIORITY
    }
  }
}
