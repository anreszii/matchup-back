import { Match } from '../../Interfaces'
import { DocumentType, getModelForClass, prop } from '@typegoose/typegoose'
import { RatingCalculator } from '../../Classes'

export class Rating {
  @prop({ required: true, default: 0 })
  GRI!: number //Generalized Rating Indicator
  @prop({
    required: true,
    default: {
      kills: 0,
      deaths: 0,
      assists: 0,
    },
  })
  GS!: Match.Member.Statistic //Generalized Statistic
  @prop({ required: true, default: 1 })
  GSI!: number ////Generalized Statistic Indicator
  @prop({ required: true, default: 0 })
  WC!: number //Win Counter
  @prop({ required: true, default: 0 })
  LC!: number //Lose Counter

  public integrate(
    statistic: Match.Member.Statistic,
    resultOfMatch: Match.Result,
  ) {
    if (resultOfMatch == Match.Result.WIN) this.WC++
    if (resultOfMatch == Match.Result.LOSE) this.LC++

    let { kills, deaths, assists } = statistic

    this._addKills(kills)
    this._addDeaths(deaths)
    this._addAssists(assists)

    let Calculator = new RatingCalculator()
    Calculator.integrateKDA(kills, deaths, assists)
    this.GSI *= Calculator.RatingIndicator

    Calculator.calculateMatchResult(resultOfMatch)

    this.GRI += Calculator.RatingIndicator
  }

  private _addKills(count: number) {
    this.GS.kills += count
  }

  private _addDeaths(count: number) {
    this.GS.deaths += count
  }

  private _addAssists(count: number) {
    this.GS.assists += count
  }
}

export const RatingModel = getModelForClass(Rating)
