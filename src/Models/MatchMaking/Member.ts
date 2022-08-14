import { prop, Ref } from '@typegoose/typegoose'
import { command } from '../../Classes/MatchMaking'
import { Statistic } from './Statistic'

export class Member {
  @prop({ required: true })
  public name!: string
  @prop({ required: true })
  public command!: command
  @prop({ required: true, ref: Statistic, _id: false })
  public statistic!: Ref<Statistic>
}
