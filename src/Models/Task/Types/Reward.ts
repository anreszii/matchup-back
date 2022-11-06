import { prop } from '@typegoose/typegoose'

export class TaskTypeReward {
  @prop()
  mp?: number
  @prop()
  exp?: number
}
