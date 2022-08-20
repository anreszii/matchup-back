import { prop, Ref } from '@typegoose/typegoose'
import { Match } from '../../Interfaces/index.js'
import { Statistic } from './Statistic.js'

export class Member {
  @prop({ required: true })
  public name!: string
  @prop({ required: true })
  public command!: Match.Member.command
  @prop({ required: true, ref: Statistic, _id: false })
  public statistic!: Ref<Statistic>
}
