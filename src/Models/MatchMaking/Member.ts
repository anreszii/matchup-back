import { prop, Ref } from '@typegoose/typegoose'
import { Match } from '../../Interfaces'
import { Statistic } from './Statistic'

export class MemberRecord {
  @prop({ required: true })
  public name!: string
  @prop({ required: true })
  public command!: Match.Member.command
  @prop({ required: true, default: new Statistic() })
  public statistic!: Statistic
}
