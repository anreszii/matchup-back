import { prop } from '@typegoose/typegoose'
import type { Match } from '../../Interfaces'

export class Statistic implements Match.Member.Statistic {
  @prop({ required: true, default: 0 })
  kills!: number
  @prop({ required: true, default: 0 })
  deaths!: number
  @prop({ required: true, default: 0 })
  assists!: number
  @prop({ required: true, default: 0 })
  points!: number
}
