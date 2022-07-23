import { model, Schema, Types } from 'mongoose'
import { RewardSchema, IReward } from './Reward'

export declare interface IBattlePassLevel {
  _id: Types.ObjectId
  requiredEXP: number
  reward: IReward
}

export const BattlePassLevelSchema = new Schema<IBattlePassLevel>({
  requiredEXP: { type: Number, required: true },
  reward: RewardSchema,
})

model('BattlePassLevel', BattlePassLevelSchema)
