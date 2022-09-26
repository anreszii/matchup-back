import {
  prop,
  getModelForClass,
  Ref,
  DocumentType,
  ReturnModelType,
} from '@typegoose/typegoose'
import { Types } from 'mongoose'

import {
  DAY_IN_MS,
  HOUR_IN_MS,
  MINUTE_IN_MS,
  WEEK_IN_MS,
  YEAR_IN_MS,
} from '../../configs/time_constants'

import {
  DYNAMIC_DATA,
  STATIC_DATA,
  STATIC_TASK,
} from '../../configs/task_reward'
import { validationCause, ValidationError } from '../../error'
import { User, UserModel } from '../index'
import { expirationTime, ExpirationTime } from './ExpirationTime'
import { Flags } from './Flags'
import { Progress } from './Progress'
import { Reward } from './Reward'
import { TaskData } from './TaskData'

class TaskList {
  @prop({ required: true, ref: () => User })
  owner: Ref<User>
  @prop({ required: true, ref: () => Task, default: [] })
  tasks!: Ref<Task>[]

  public static findListByUserName(
    this: ReturnModelType<typeof TaskList>,
    name: string,
  ) {
    return UserModel.findByName(name).then((user) => {
      if (user) return this.findOne({ owner: user._id })
    })
  }

  public static findListByUser(
    this: ReturnModelType<typeof TaskList>,
    user: User | Types.ObjectId,
  ) {
    return this.findOne({ owner: user })
  }

  public getDaily(this: DocumentType<TaskList>) {
    let dailyTasks: Array<DocumentType<Task>> = new Array()

    for (let i = 0; i < this.tasks.length; i++) {
      let taskID = this.tasks[i]
      if (!taskID) continue

      TaskModel.findById(taskID).then((task) => {
        if (!task) return
        if (task.expires && task.expires.expirationType == 'day')
          dailyTasks.push(task)
      })
    }

    return dailyTasks
  }

  public async collectRewardsFromDaily(this: DocumentType<TaskList>) {
    let user = await UserModel.findById(this.owner)
    if (!user) return

    let daily = this.getDaily()
    let collectedReward = {
      exp: 0,
      mp: 0,
    }

    for (let task of daily) {
      if (!task.isComplete) continue
      let rewards = await task.complete()
      if (!rewards) continue

      for (let reward of rewards) {
        switch (reward.type) {
          case 'mp': {
            collectedReward.mp += reward.amount
            break
          }

          case 'exp': {
            collectedReward.exp += reward.amount
            break
          }
        }
      }
    }

    user.addEXP(collectedReward.exp)
    user.addMP(collectedReward.mp)
    user.checkLevel()
    await user.save()
  }

  public async createTask(this: DocumentType<TaskList>, name: string) {
    let user = await UserModel.findById(this.owner)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)
    let data: STATIC_TASK | undefined

    if (DYNAMIC_DATA.has(name)) {
      let dataSe = DYNAMIC_DATA.get(name)!
      let tmp = new TaskData(dataSe)

      data = tmp.data
    } else if (STATIC_DATA.has(name)) {
      data = STATIC_DATA.get(name)!
    }
    if (!data) return

    let task = await this._create(user.profile.username, name, data.points)
    if (data.reward.mp && data.reward.mp > 0) task.mp = data.reward.mp
    if (data.reward.exp && data.reward.exp > 0) task.exp = data.reward.exp

    task.expirationTime = {
      amount: 1,
      format: 'day',
    }

    return task.save()
  }

  public _create(userName: string, taskName: string, requiredPoints: number) {
    return TaskModel.create({
      owner: userName,
      name: taskName,
      progress: {
        currentPoints: 0,
        requiredPoints,
      },
    })
  }
}

class Task {
  @prop({ required: true })
  owner!: string
  @prop({ required: true })
  name!: string
  @prop({ required: true, default: new Flags() })
  flags!: Flags
  @prop({ required: true, default: [] })
  rewards!: Reward[]
  @prop({ required: true })
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
}

export const TaskModel = getModelForClass(Task)
