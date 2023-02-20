import type { Match } from '../../Interfaces'
import { prop } from '@typegoose/typegoose'
import { Statistic } from './Statistic'

export class MemberRecord {
  @prop({ required: true })
  name!: string
  @prop({ required: true })
  command!: Match.Lobby.Command.Types
  @prop()
  ratingChange?: number
  @prop()
  image?: string
  @prop({ required: true, default: new Statistic(), _id: false })
  statistic!: Statistic
}
