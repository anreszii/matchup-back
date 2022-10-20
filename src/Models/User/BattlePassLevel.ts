import { prop } from '@typegoose/typegoose'
import { Reward } from '../Reward'

export class UserLevel {
  @prop({ required: true, default: 0 })
  currentBPLevel!: number
  @prop({ required: true, default: 0 })
  currentRequiredEXP!: number
  @prop({ required: true, default: 0 })
  currentEXP!: number
  @prop()
  reward?: Reward
}
