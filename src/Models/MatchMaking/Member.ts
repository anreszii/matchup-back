import { prop, Ref } from '@typegoose/typegoose'
import { Match } from '../../Interfaces'
import { Statistic } from './Statistic'

export class Member {
  @prop({ required: true })
  public name!: string
  @prop({ required: true })
  public command!: Match.Member.command
  @prop({ required: true })
  public statistic!: Statistic
}
