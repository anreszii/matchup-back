import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose'

import {
  DAY_IN_MS,
  HOUR_IN_MS,
  MINUTE_IN_MS,
  WEEK_IN_MS,
  YEAR_IN_MS,
} from '../../configs/time_constants'

import { validationCause, ValidationError } from '../../error'
import { expirationTime, ExpirationTime } from './ExpirationTime'
import { Flags } from './Flags'
import { Progress } from './Progress'
import { Reward } from '../Reward'

export class Task {
  @prop({ required: true })
  owner!: string
  @prop({ required: true })
  name!: string
  @prop({ required: true, default: new Flags(), _id: false })
  flags!: Flags
  @prop({ required: true, default: [], type: () => Reward, _id: false })
  rewards!: Reward[]
  @prop({ required: true, _id: false })
  progress!: Progress
  @prop()
  expires?: ExpirationTime

  public addProgess(amount: number) {
    if (amount <= 0) return
    this.progress.currentPoints += amount
  }

  public async complete(this: DocumentType<Task>) {
    if (!this.isComplete || this.flags.complete) return

    this.flags.complete = true
    await this.save()

    return this.rewards
  }

  public get isComplete() {
    return this.progress.currentPoints < this.progress.requiredPoints
  }

  public get expiresIn() {
    if (!this.expires) return
    if (!this.expires.expirationDate)
      throw Error(`Expiration time isn't setted`)

    let timePassed =
      this.expires.expirationDate.getTime() - new Date().getTime()
    return timePassed / MINUTE_IN_MS
  }

  public set expirationTime(expires: expirationTime) {
    if (this.expires)
      throw new ValidationError(
        'expiration time',
        validationCause.ALREADY_EXIST,
      )

    let { amount, format } = expires

    let date = new Date().getTime()
    let resultInMs = undefined

    switch (format) {
      case 'hour': {
        resultInMs = date + amount * HOUR_IN_MS
        break
      }

      case 'day': {
        resultInMs = date + amount * DAY_IN_MS
        break
      }

      case 'week': {
        resultInMs = date + amount * WEEK_IN_MS
        break
      }

      case 'year': {
        resultInMs = date + amount * YEAR_IN_MS
        break
      }

      default: {
        resultInMs = date + amount
        break
      }
    }

    let expiration = new ExpirationTime()

    expiration.expirationType = format
    expiration.expirationDate = new Date(resultInMs)

    this.expires = expiration
  }

  public set mp(amount: number) {
    for (let reward of this.rewards) if ((reward.type = 'mp')) return

    this.rewards.push({ amount, type: 'mp' })
  }

  public set exp(amount: number) {
    for (let reward of this.rewards) if ((reward.type = 'exp')) return

    this.rewards.push({ amount, type: 'exp' })
  }

  public get mp() {
    for (let reward of this.rewards)
      if ((reward.type = 'mp')) return reward.amount
    return 0
  }

  public get exp() {
    for (let reward of this.rewards)
      if ((reward.type = 'exp')) return reward.amount
    return 0
  }

  public get isExpired() {
    if (!this.expiresIn) return false
    return this.expiresIn <= 0
  }
}

export const TaskModel = getModelForClass(Task)
