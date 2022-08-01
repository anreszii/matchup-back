import { Schema } from 'mongoose'
import type { rewardType } from '../app'

export declare interface IReward {
  amount: number
  type: rewardType
}

export const RewardSchema = new Schema<IReward>({
  amount: Number,
  type: String,
})
