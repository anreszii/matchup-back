import { Match } from '../index'
import type { RatingCalculator } from './Calculator'
import type { SearchEngine } from './SearchEngine'

export declare namespace Rating {
  namespace Calculator {
    interface Instance extends RatingCalculator {}
  }
  namespace SearchEngine {
    interface Instance extends SearchEngine {}
    interface Filters {
      byRegion(region: Rating.SearchEngine.SUPPORTED_REGIONS): Filters
      byRegime(type: Match.Lobby.Type): Filters
      byGRI(GRI: number): Filters
      byTeam(id: number): Filters
      byGuild(): Filters

      use(lobby: Match.Lobby.Instance): { [key: string]: number }
      get count(): { [key: string]: number }
    }

    interface Finder {
      find(): Promise<Match.Lobby.Instance | null>
    }
    type SUPPORTED_REGIONS = 'Europe' | 'Asia'

    const enum SEARCH_ZONE {
      'small' = 0,
      'medium' = 1,
      'large' = 2,
    }

    type FILTER_PRIORITY = 'optional' | 'required'

    interface Filter {
      isValid(lobby: Match.Lobby.Instance): boolean
      get priority(): FILTER_PRIORITY
    }
  }
}
