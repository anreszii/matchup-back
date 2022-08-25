import { Match } from '../index'

export declare interface RatingCalculator {
  integrateKDA(kills: number, deaths: number, assists: number): RatingCalculator
  calculateKills(kills: number): RatingCalculator
  calculateDeaths(deaths: number): RatingCalculator
  calculateAssists(assists: number): RatingCalculator
  calculateMatchResult(result: Match.Result): RatingCalculator

  get RatingIndicator(): number
}
