import type { RatingCalculator } from './Calculator'
import { MatchFinder } from './SearchEngine'

export declare namespace Rating {
  namespace Calculator {
    interface Instance extends RatingCalculator {}
  }
  namespace SearchEngine {
    interface Instance extends MatchFinder {}
    const enum SUPPORTED_REGIONS {
      'Europe',
      'Asia',
    }
  }
}
