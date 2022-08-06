import { Schema, Model, model, HydratedDocument } from 'mongoose'
import { TaksList } from '../configs/task_rewards'
import { DAY_IN_MS, HOUR_IN_MS, MINUTE_IN_MS } from '../configs/time_constants'
import { IReward, RewardSchema } from './Reward'

export declare interface ITask {
  owner: string
  name: string
  completeFlag: boolean
  staticFlag: boolean
  reward: IReward
  progress: progress
  expirationTime: Date
}

export declare interface ITaskBehavior {
  create(
    owner: string,
    taskName: string,
    expires: expirationTime,
  ): Promise<HydratedDocument<ITask, ITaskBehavior>> | never
  complete(): Promise<IReward>

  isComplete(): boolean
  getProgress(): progress
  addProgress(amount: number): Promise<void>

  setExpirationTime(expires: expirationTime): void
  getExpirationTime(): number
  expiresIn(): number
}

interface TaskModel extends Model<ITask, {}, ITaskBehavior> {
  getSpecific(
    owner: string,
    taskName: string,
  ): Promise<HydratedDocument<ITask, ITaskBehavior>>
}

export declare type expirationTime = {
  amount: number
  format: 'days' | 'hours' | 'minutes'
}

export declare type progress = {
  currentPoint: number
  finalPoint: number
}

const TaskSchema = new Schema<ITask, TaskModel, ITaskBehavior>({
  owner: { type: String, required: true, index: true },
  completeFlag: { type: Boolean, required: true, default: false },
  staticFlag: { type: Boolean, required: true, default: false },
  name: { type: String, required: true },
  reward: RewardSchema,
  progress: new Schema<progress>({
    currentPoint: Number,
    finalPoint: Number,
  }),
  expirationTime: Date,
})

TaskSchema.statics.getSpecific = function (owner, taskName) {
  return this.findOne({ owner, name: taskName })
}

TaskSchema.methods.create = function (owner, taskName, expires) {
  if (!TaksList.has(taskName)) throw Error(`task doesn't exist`)
  let task = TaksList.get(taskName)!.data

  this.owner = owner
  this.name = taskName

  this.setExpirationTime(expires)

  this.progress = `0:${task.finalPoint}`
  this.reward = task.reward
  this.staticFlag = task.isStatic

  return this.save()
}

TaskSchema.methods.complete = async function () {
  this.completeFlag = true
  await this.save()

  return this.reward
}

TaskSchema.methods.isComplete = function () {
  return this.progress.currentPoint == this.progress.finalPoint
}

TaskSchema.methods.getProgress = function () {
  return this.progress
}

TaskSchema.methods.addProgress = async function (amount) {
  if (this.completeFlag) return

  this.progress.currentPoint += amount
  await this.save()
}

TaskSchema.methods.setExpirationTime = function (expires) {
  if (this.optional.expirationTime)
    throw Error('Expiration time has already set')
  let { amount, format } = expires

  let date = new Date().getTime()
  let resultInMs = undefined

  switch (format) {
    case 'minutes': {
      resultInMs = date + amount * MINUTE_IN_MS
      break
    }

    case 'hours': {
      resultInMs = date + amount * HOUR_IN_MS
      break
    }

    case 'days': {
      resultInMs = date + amount * DAY_IN_MS
      break
    }

    default: {
      resultInMs = date + amount
      break
    }
  }

  this.optional.expirationTime = new Date(resultInMs)
}

TaskSchema.methods.getExpirationTime = function () {
  if (!this.optional.expirationTime) throw Error(`Expiration time isn't setted`)

  return this.optional.expirationTime
}

TaskSchema.methods.expiresIn = function () {
  if (!this.optional.expirationTime) throw Error(`Expiration time isn't setted`)

  let timePassed = this.optional.expirationTime.getTime() - new Date().getTime()

  return timePassed / MINUTE_IN_MS
}

const Task = model<ITask, TaskModel>('Task', TaskSchema)
