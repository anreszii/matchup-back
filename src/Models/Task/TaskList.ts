import {
  prop,
  getModelForClass,
  Ref,
  DocumentType,
  ReturnModelType,
} from '@typegoose/typegoose'
import { Types } from 'mongoose'

import {
  DYNAMIC_DATA,
  STATIC_DATA,
  STATIC_TASK,
} from '../../configs/task_reward'
import { validationCause, ValidationError } from '../../error'
import { UserModel } from '../index'
import { TaskData } from './TaskData'
import { User } from '../User/User'
import { Task } from './Task'
import { TaskModel } from '../'

export class TaskList {
  @prop({ required: true, ref: () => User })
  owner: Ref<User>
  @prop({ required: true, ref: () => Task, default: [] })
  tasks!: Ref<Task>[]

  public static async findListByUserName(
    this: ReturnModelType<typeof TaskList>,
    name: string,
  ) {
    const user = await UserModel.findByName(name)
    if (user) return this.findOne({ owner: user._id })
  }

  public static async findListByUser(
    this: ReturnModelType<typeof TaskList>,
    user: User | Types.ObjectId,
  ) {
    return this.findOne({ owner: user })
  }

  public static async createListForUser(
    this: ReturnModelType<typeof TaskList>,
    user: User | Types.ObjectId | string,
  ) {
    let userDocument: DocumentType<User> | null
    if (typeof user == 'string')
      userDocument = await UserModel.findByName(user)!
    else userDocument = await UserModel.findById(user)!

    return this.create({ owner: userDocument, tasks: [] })
  }

  public getDaily(
    this: DocumentType<TaskList>,
  ): Array<DocumentType<Task>> | Promise<Array<DocumentType<Task>>> {
    let dailyTasks: Array<DocumentType<Task>> = new Array()

    for (let i = 0; i < this.tasks.length; i++) {
      let taskID = this.tasks[i]
      if (!taskID) continue

      TaskModel.findById(taskID).then((task) => {
        if (!task || task.isExpired || !task.expires) return
        if (this._isDailyTask(task)) dailyTasks.push(task)
      })
    }

    if (dailyTasks.length < 4) {
      let promises = []
      for (let task of dailyTasks) promises.push(task.delete())
      return Promise.all(promises).then(() => {
        return this._createDailyTasks().then((tasks) => {
          if (!tasks) throw new Error(`Can't create daity tasks`)
          return tasks
        })
      })
    }

    return dailyTasks
  }

  public async collectRewardsFromDaily(this: DocumentType<TaskList>) {
    let user = await UserModel.findById(this.owner)
    if (!user) return

    let daily = await this.getDaily()
    let collectedReward = {
      exp: 0,
      mp: 0,
      levels: 0,
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
    let result = user.checkLevel()
    if (result.previous.currentBPLevel != result.current.currentBPLevel) {
      collectedReward.levels +=
        result.current.currentBPLevel - result.previous.currentBPLevel
      switch (result.previous.reward?.type) {
        case 'mp':
          collectedReward.mp += result.previous.reward.amount
          break
        case 'exp':
          collectedReward.exp += result.previous.reward.amount
          break
      }
    }
    await user.save()

    return collectedReward
  }

  public async createTask(this: DocumentType<TaskList>, name: string) {
    let user = await UserModel.findById(this.owner)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)
    let data: STATIC_TASK | undefined

    if (DYNAMIC_DATA.has(name)) {
      let dataSet = DYNAMIC_DATA.get(name)!
      data = TaskData.getDataFrom(dataSet)
    } else if (STATIC_DATA.has(name)) {
      data = STATIC_DATA.get(name)!
    }
    if (!data) return

    let task = await this._create(user.profile.username, name, data.points)
    if (data.reward.mp && data.reward.mp > 0) task.mp = data.reward.mp
    if (data.reward.exp && data.reward.exp > 0) task.exp = data.reward.exp

    if (data.expirationType) {
      task.expirationTime = {
        amount: 1,
        format: data.expirationType,
      }
    }

    return task.save()
  }

  private async _createDailyTasks(this: DocumentType<TaskList>) {
    let usedNames: Array<string> = []
    let dailyTasks = []
    let promises = []
    let task

    while (dailyTasks.length != 3) {
      task = await this._createRandomDailyTask(usedNames)
      if (!task) return

      dailyTasks.push(task)
      usedNames.push(task.name)
      promises.push(task.save())
    }

    let completeDailyTask = await this._createTaskToCompleteAllDaily

    dailyTasks.push(completeDailyTask)
    promises.push(completeDailyTask.save())

    await Promise.all(promises)
    return dailyTasks
  }

  private async _createRandomDailyTask(
    this: DocumentType<TaskList>,
    usedTasksNames: Array<string>,
  ) {
    let user = await UserModel.findById(this.owner)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)

    let task = DYNAMIC_DATA.getRandomDaily(usedTasksNames)
    if (!task) return

    let data = TaskData.getDataFrom(task.data)

    let createdTask = await this._create(
      user.profile.username,
      task.name,
      data.points,
    )
    if (data.reward.mp && data.reward.mp > 0) createdTask.mp = data.reward.mp
    if (data.reward.exp && data.reward.exp > 0)
      createdTask.exp = data.reward.exp

    createdTask.expirationTime = {
      amount: 1,
      format: task.data.expirationType,
    }

    return createdTask
  }

  private get _createTaskToCompleteAllDaily() {
    let data = STATIC_DATA.get('completedDaily')!
    return this._ownerName.then((username) => {
      return this._create(username, 'completedDaily', data.points).then(
        (task) => {
          if (data.reward.mp && data.reward.mp > 0) task.mp = data.reward.mp
          if (data.reward.exp && data.reward.exp > 0) task.exp = data.reward.exp

          task.expirationTime = {
            amount: 1,
            format: data.expirationType!,
          }

          return task
        },
      )
    })
  }

  private _create(userName: string, taskName: string, requiredPoints: number) {
    return TaskModel.create({
      owner: userName,
      name: taskName,
      progress: {
        currentPoints: 0,
        requiredPoints,
      },
    })
  }

  private _isDailyTask(task: DocumentType<Task>) {
    if (!task.expires || task.expires.expirationType != 'day') return false
    return true
  }

  private get _ownerName() {
    return UserModel.findById(this.owner).then((user) => {
      if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)
      return user.profile.username
    })
  }
}
