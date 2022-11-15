import { prop, ReturnModelType, DocumentType } from '@typegoose/typegoose'
import { TechnicalCause, TechnicalError } from '../../../error'
import { expType } from '../ExpirationTime'
import { TaskTypeReward } from './Reward'

export type STATIC_TASK = {
  points: number
  expirationType?: expType
  reward: TaskTypeReward
}

export class StaticTask {
  @prop({ required: true })
  name!: string
  @prop({ required: true })
  points!: number
  @prop({ required: true })
  expirationType!: expType
  @prop({ required: true, _id: false, type: () => TaskTypeReward })
  reward!: TaskTypeReward

  public static async createType(
    this: ReturnModelType<typeof StaticTask>,
    name: string,
    points: number,
    reward: { mp?: number; exp?: number },
    expType?: expType,
  ) {
    let newType = new this({
      name,
      points,
      expirationType: expType,
      reward,
    })

    this._validateNewType(newType)
    await newType.save()
  }

  public static async hasType(
    this: ReturnModelType<typeof StaticTask>,
    name: string,
  ) {
    if (!(await this.findOne({ name }))) return false
    return true
  }

  public static getType(
    this: ReturnModelType<typeof StaticTask>,
    name: string,
    expirationType?: expType,
  ) {
    return this.findOne({
      name,
      expType: expirationType,
    })
  }

  private static _validateNewType(type: DocumentType<StaticTask>) {
    this._validatePoints(type.points)
    this._validateExpType(type.expirationType)
    this._validateReward(type.reward)
  }

  private static _validatePoints(points: number) {
    if (typeof points != 'number' || points < 0)
      throw new TechnicalError('points', TechnicalCause.INVALID_FORMAT)
  }

  private static _validateExpType(exp: unknown) {
    if (exp != undefined && typeof exp != 'string')
      throw new TechnicalError('expiration type', TechnicalCause.INVALID_FORMAT)
    if (!exp) return
    if (exp != 'hour' && exp != 'day' && exp != 'week' && exp != 'year')
      throw new TechnicalError('expiration type', TechnicalCause.INVALID_FORMAT)
  }

  private static _validateReward(reward: { mp?: number; exp?: number }) {
    if (reward.mp) {
      if (typeof reward.mp != 'number')
        throw new TechnicalError('reward mp', TechnicalCause.INVALID_FORMAT)
      if (reward.mp < 0)
        throw new TechnicalError('reward mp', TechnicalCause.INVALID)
    }

    if (reward.exp) {
      if (typeof reward.exp != 'number')
        throw new TechnicalError('reward exp', TechnicalCause.INVALID_FORMAT)
      if (reward.exp < 0)
        throw new TechnicalError('reward exp', TechnicalCause.INVALID)
    }
  }
}
