import { prop, DocumentType, Ref } from '@typegoose/typegoose'

import {
  DAY_IN_MS,
  HOUR_IN_MS,
  MINUTE_IN_MS,
  WEEK_IN_MS,
  YEAR_IN_MS,
} from '../../configs/time_constants'
import { expirationTime, ExpirationTime } from './ExpirationTime'
import { Flags } from './Flags'
import { Progress } from './Progress'
import { Reward } from '../Reward'
import { User } from '../User/User'
import { TechnicalCause, TechnicalError } from '../../error'

export class Task {
  @prop({ required: true, ref: () => User })
  owner!: Ref<User>
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
    if (!this._hasRequiredPointsCount || this.flags.complete) return

    this.flags.complete = true
    await this.save()

    return this.rewards
  }

  public get isComplete() {
    return this.flags.complete
  }

  public get expiresIn() {
    if (!this.expires) return
    if (!this.expires.expirationDate)
      throw new TechnicalError('expiration time', TechnicalCause.REQUIRED)

    let timePassed =
      this.expires.expirationDate.getTime() - new Date().getTime()
    return timePassed / MINUTE_IN_MS
  }

  public set expirationTime(expires: expirationTime) {
    if (this.expires)
      throw new TechnicalError('expiration time', TechnicalCause.ALREADY_EXIST)
    let { amount, format } = expires

    let date = new Date()
    switch (format) {
      case 'hour': {
        date.setUTCHours(date.getUTCHours() + amount)
        break
      }

      case 'day': {
        date.setUTCDate(date.getUTCDate() + amount)
        break
      }

      case 'week': {
        date.setUTCDate(date.getUTCDate() + 7 * amount)
        break
      }

      case 'year': {
        date.setUTCMonth(date.getUTCMonth() + 12 * amount)
        break
      }

      default: {
        date.setUTCDate(date.getUTCDate() + amount)
        break
      }
    }

    let expiration = new ExpirationTime()

    expiration.expirationType = format
    expiration.expirationDate = date

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

  private get _hasRequiredPointsCount() {
    return this.progress.currentPoints < this.progress.requiredPoints
  }
}
