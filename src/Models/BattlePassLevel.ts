import { Reward } from './Reward.js'

import { prop, getModelForClass, Ref } from '@typegoose/typegoose'

class BattlePassLevel {
  @prop({ required: true, unique: true })
  public id!: number
  @prop({ required: true })
  public requiredEXP!: number
  @prop({ required: true, ref: Reward })
  public reward: Ref<Reward>
}

export const BPLevelModel = getModelForClass(BattlePassLevel)
