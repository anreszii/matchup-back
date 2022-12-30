import { DocumentType, prop, ReturnModelType } from '@typegoose/typegoose'
import { TechnicalCause, TechnicalError } from '../../../error'
import { shuffle } from '../../../Utils/shuffle'
import { expType } from '../ExpirationTime'
import { TaskTypeReward } from './Reward'
import { MINUTE_IN_MS, SECOND_IN_MS } from '../../../configs/time_constants'

export type DYNAMIC_TASK = {
  minPoints: number
  maxPoints: number
  stepForPoints: number
  expirationType?: expType
  customCoefficient?: number
  reward: TaskTypeReward
}

export class DynamicTask implements DYNAMIC_TASK {
  @prop({ required: true })
  name!: string
  @prop({ required: true })
  minPoints!: number
  @prop({ required: true })
  maxPoints!: number
  @prop({ required: true })
  stepForPoints!: number
  @prop()
  expirationType?: expType
  @prop({ required: true, _id: false, type: () => TaskTypeReward })
  reward!: TaskTypeReward

  public static async createType(
    this: ReturnModelType<typeof DynamicTask>,
    name: string,
    minPoints: number,
    maxPoints: number,
    stepForPoints: number,
    reward: { mp?: number; exp?: number },
    expType?: expType,
  ) {
    let newType = new this({
      name,
      minPoints,
      maxPoints,
      stepForPoints,
      expirationType: expType,
      reward,
    })

    this._validateNewType(newType)
    await newType.save()
  }

  public static getType(
    this: ReturnModelType<typeof DynamicTask>,
    name: string,
    expirationType?: expType,
  ) {
    return this.findOne({
      name,
      expType: expirationType,
    })
  }

  public static async hasType(
    this: ReturnModelType<typeof DynamicTask>,
    name: string,
  ) {
    if (!(await this.findOne({ name }))) return false
    return true
  }

  public static async getRandomDaily(
    this: ReturnModelType<typeof DynamicTask>,
    usedTasksNames?: Array<string>,
    types?: DocumentType<DynamicTask>[],
  ) {
    if (!types) types = await this.find({})
    types = shuffle(types)
    for (let i = 0; i < types.length; i++) {
      let type = types[i]
      if (
        type.expirationType == 'day' &&
        !usedTasksNames?.includes(type.name)
      ) {
        return {
          name: type.name,
          data: type as DYNAMIC_TASK & { expirationType: 'day' },
          types,
        }
      }
    }
  }

  public static async getRandomWeekly(
    this: ReturnModelType<typeof DynamicTask>,
    usedTasksNames?: Array<string>,
    types?: DocumentType<DynamicTask>[],
  ) {
    if (!types) types = await this.find({})
    types = shuffle(types)
    for (let i = 0; i < types.length; i++) {
      let type = types[i]
      if (
        type.expirationType == 'week' &&
        !usedTasksNames?.includes(type.name)
      ) {
        return {
          name: type.name,
          data: type as DYNAMIC_TASK & { expirationType: 'week' },
          types,
        }
      }
    }
  }

  private static _validateNewType(type: DocumentType<DynamicTask>) {
    this._validateMinPoints(type.minPoints)
    this._validateMaxPoints(type.minPoints, type.maxPoints)
    this._validateStep(type.stepForPoints, type.minPoints, type.maxPoints)
    this._validateExpType(type.expirationType)
    this._validateReward(type.reward)
  }

  private static _validateMinPoints(points: number) {
    if (typeof points != 'number' || points < 0)
      throw new TechnicalError('min points', TechnicalCause.INVALID_FORMAT)
  }

  private static _validateMaxPoints(minPoints: number, maxPoints: number) {
    if (typeof maxPoints != 'number' || maxPoints < 0)
      throw new TechnicalError('max points', TechnicalCause.INVALID_FORMAT)
    if (maxPoints < minPoints)
      throw new TechnicalError('max points', TechnicalCause.INVALID)
  }

  private static _validateStep(
    step: number,
    minPoints: number,
    maxPoints: number,
  ) {
    if (typeof step != 'number' || step < 0)
      throw new TechnicalError('step for points', TechnicalCause.INVALID_FORMAT)
    if (step > maxPoints - minPoints || maxPoints % step != 0)
      throw new TechnicalError('step for points', TechnicalCause.INVALID)
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
        throw new TechnicalError('reward mp', TechnicalCause.NEED_HIGHER_VALUE)
    }

    if (reward.exp) {
      if (typeof reward.exp != 'number')
        throw new TechnicalError('reward exp', TechnicalCause.INVALID_FORMAT)
      if (reward.exp < 0)
        throw new TechnicalError('reward exp', TechnicalCause.NEED_HIGHER_VALUE)
    }
  }
}
