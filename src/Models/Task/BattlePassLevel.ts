import { Reward } from '../Reward'

import {
  prop,
  getModelForClass,
  Ref,
  ReturnModelType,
} from '@typegoose/typegoose'

class BattlePassLevel {
  @prop({ required: true, unique: true })
  public level!: number
  @prop({ required: true })
  public requiredEXP!: number
  @prop({ required: true })
  public reward!: Reward

  public static async getAllLevels(
    this: ReturnModelType<typeof BattlePassLevel>,
  ) {
    return this.find()
  }
}

export const BPLevelModel = getModelForClass(BattlePassLevel)
