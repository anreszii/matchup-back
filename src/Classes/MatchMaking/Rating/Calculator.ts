import { Match, Rating } from '../../../Interfaces'
import { Logger } from '../../../Utils/Logger'

export class RatingCalculator implements Rating.Calculator.Instance {
  private _RI: number = 1
  private _logger = new Logger('Rating Calculator')
  integrateKDA(
    kills: number,
    deaths: number,
    assists: number,
  ): RatingCalculator {
    this._logger.trace(
      `KDA: ${JSON.stringify({
        kills,
        deaths,
        assists,
      })}; CALCULATED INDICATOR: ${this._RI}`,
    )
    this.calculateKills(kills).calculateDeaths(deaths).calculateAssists(assists)
    return this
  }
  get RatingIndicator(): number {
    return Math.round(this._RI)
  }

  public calculateDeaths(deaths: number) {
    this._RI *= 1 / (deaths + 1)
    return this
  }

  public calculateKills(kills: number) {
    this._RI *= 0.5 * kills
    return this
  }

  public calculateAssists(assists: number) {
    this._RI += 0.2 * assists
    return this
  }

  public calculateMatchResult(result: Match.Result) {
    switch (result) {
      case Match.Result.WIN:
        this._RI += 3
        break
      case Match.Result.LOSE:
        this._RI -= 3
        break
      case Match.Result.DRAW:
        this._RI += 1
        break
    }
    return this
  }
}
