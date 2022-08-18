import { prop, Ref } from '@typegoose/typegoose'
import { COMMAND } from '../../Interfaces'
import { Statistic } from './Statistic'

export class Member {
  @prop({ required: true })
  public name!: string
  @prop({ required: true })
  public command!: COMMAND
  @prop({ required: true, ref: Statistic, _id: false })
  public statistic!: Ref<Statistic>
}
