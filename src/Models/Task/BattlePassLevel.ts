import { Reward } from './Reward'

import { prop, getModelForClass, Ref } from '@typegoose/typegoose'

class BattlePassLevel {
  @prop({ required: true, unique: true })
  public level!: number
  @prop({ required: true })
  public requiredEXP!: number
  @prop({ required: true })
  public reward!: Reward
}

export const BPLevelModel = getModelForClass(BattlePassLevel)
