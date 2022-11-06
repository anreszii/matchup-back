import { prop, Ref, DocumentType, ReturnModelType } from '@typegoose/typegoose'
import { Types } from 'mongoose'

import {
  DYNAMIC_DATA,
  STATIC_DATA,
  STATIC_TASK,
} from '../../configs/task_reward'
import { UserModel } from '../index'
import { TaskData } from './TaskData'
import { User } from '../User/User'
import { Task } from './Task'
import { TaskModel } from '../'
import { TechnicalCause, TechnicalError } from '../../error'
import { Reward } from '../Reward'

export class TaskList {
  @prop({ required: true, ref: () => User })
  owner!: Ref<User>
  @prop({ required: true, ref: () => Task, default: [] })
  tasks!: Ref<Task>[]

  public static async getForUser(
    this: ReturnModelType<typeof TaskList>,
    user: User | Types.ObjectId | string,
  ) {
    const promises: Promise<unknown>[] = []
    let userDocument: DocumentType<User> | null
    if (typeof user == 'string')
      userDocument = await UserModel.findByName(user)!
    else userDocument = await UserModel.findById(user)!
    if (!userDocument)
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    let result = await this._checkUserList(userDocument)
    if (result) return this._loadTasksFromID(result)

    let tasks = await this.create({ owner: userDocument, tasks: [] })

    promises.push(tasks.getDaily())
    promises.push(tasks.getWeekly())
    await Promise.all(promises)

    await tasks.save()
    return this._loadTasksFromID(tasks)
  }

  public static async deleteForUser(
    this: ReturnModelType<typeof TaskList>,
    owner: User | Types.ObjectId,
  ) {
    return this.findOne({ owner }).then((tasks) => {
      if (!tasks) return

      return tasks.clear().then(() => {
        return tasks.delete()
      })
    })
  }

  public async getDaily(this: DocumentType<TaskList>) {
    let wasCleared = this._clearCurrentDailyTasksIfCountInvalid()
    if (!wasCleared) return this._findCurrentDailyTasks()

    let tasks = await this._createDailyTasks()
    if (!tasks) throw new Error(`can't create daily tasks`)

    return tasks
  }

  public async getWeekly(this: DocumentType<TaskList>) {
    let wasCleared = this._clearCurrentWeeklyTasksIfCountInvalid()
    if (!wasCleared) return this._findCurrentWeeklyTasks()

    let tasks = await this._createWeeklyTasks()
    if (!tasks) throw new Error(`can't create daily tasks`)

    return tasks
  }

  public async clear(this: DocumentType<TaskList>): Promise<unknown> {
    const promises = []
    for (let taskID of this.tasks) {
      let task = await TaskModel.findById(taskID)
      if (!task) continue
      promises.push(task.delete())
    }
    this.tasks = []

    Promise.all(promises)
    return this.save()
  }

  public async getCompletedDailyTasksCount(this: DocumentType<TaskList>) {
    let daily = await this.getDaily()
    let counter = 0

    for (let task of daily)
      if (task.isComplete && task.name != 'completedDaily') counter++

    return counter
  }

  public async collectRewardsFromDaily(this: DocumentType<TaskList>) {
    let user = await UserModel.findById(this.owner)
    if (!user) {
      await this.clear()
      await this.delete()
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    }

    let daily = await this.getDaily()
    let collectedReward = {
      exp: 0,
      mp: 0,
      levels: 0,
    }

    const promises = []
    const rewards = []
    let completedTaskCounter = 0
    let taskRewards: Reward[] | undefined
    let completeDailyTask: DocumentType<Task> | undefined
    for (let task of daily) {
      if (!task.isComplete) continue
      if (task.flags.static && task.name == 'completedDaily') {
        completeDailyTask = task
        continue
      }
      promises.push(task.complete())
    }

    let results = await Promise.all(promises)
    for (let reward of results) {
      if (!rewards) continue

      completedTaskCounter++
      rewards.push(reward)
    }

    completeDailyTask!.addProgess(completedTaskCounter)
    taskRewards = await completeDailyTask!.complete()

    rewards.push(taskRewards)
    for (let tmp of rewards) {
      for (let reward of tmp as Reward[]) {
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

  public async collectRewardsFromWeekly(this: DocumentType<TaskList>) {
    let user = await UserModel.findById(this.owner)
    if (!user) {
      await this.clear()
      await this.delete()
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    }

    let daily = await this.getWeekly()
    let collectedReward = {
      exp: 0,
      mp: 0,
      levels: 0,
    }

    let rewards = []
    let completedTaskCounter = 0
    let taskRewards: Reward[] | undefined
    let completeDailyTask: DocumentType<Task> | undefined
    for (let task of daily) {
      if (!task.isComplete) continue
      if (task.flags.static && task.name == 'completedWeekly') {
        completeDailyTask = task
        continue
      }
      taskRewards = await task.complete()
      if (!taskRewards) continue
      completedTaskCounter++
      rewards.push(taskRewards)
    }

    completeDailyTask!.addProgess(completedTaskCounter)
    taskRewards = await completeDailyTask!.complete()

    rewards.push(taskRewards)
    for (let tmp of rewards) {
      for (let reward of tmp as Reward[]) {
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
    let data: STATIC_TASK | undefined

    if (DYNAMIC_DATA.has(name)) {
      let dataSet = DYNAMIC_DATA.get(name)!
      data = TaskData.getDataFrom(dataSet)
    } else if (STATIC_DATA.has(name)) {
      data = STATIC_DATA.get(name)!
    }
    if (!data) return

    let task = await this._create(name, data.points)
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

  private static _loadTasksFromID(
    this: ReturnModelType<typeof TaskList>,
    list: DocumentType<TaskList>,
  ) {
    const promises: Promise<DocumentType<Task> | null>[] = []
    for (let id of list.tasks) promises.push(TaskModel.findById(id).exec())

    return Promise.all(promises)
  }

  private static _checkUserList(
    this: ReturnModelType<typeof TaskList>,
    owner: DocumentType<User> | Types.ObjectId,
  ) {
    return this.findOne({ owner }).then((user) => {
      return user ?? false
    })
  }

  private _findCurrentDailyTasks(this: DocumentType<TaskList>) {
    let dailyTasks: Array<DocumentType<Task>> = new Array()
    for (let i = 0; i < this.tasks.length; i++) {
      let taskID = this.tasks[i]
      if (!taskID) continue

      TaskModel.findById(taskID).then((task) => {
        if (!task || task.isExpired || !task.expires) return
        if (this._isDailyTask(task)) dailyTasks.push(task)
      })
    }

    return dailyTasks
  }

  /** В случае, если количество ежедневных заданий меньше трех, или не было сгенерировано задание на выполнение ежедневных заданий, удаляет их
   *  @returns true, если задания были удалены, false в противном случае
   */
  private _clearCurrentDailyTasksIfCountInvalid(this: DocumentType<TaskList>) {
    let dailyTasks = this._findCurrentDailyTasks()
    if (dailyTasks.length == 4) return false

    let promises = []
    for (let task of dailyTasks) promises.push(task.delete())
    if (promises.length != 0) Promise.all(promises).then()
    return true
  }

  private _findCurrentWeeklyTasks(this: DocumentType<TaskList>) {
    let dailyTasks: Array<DocumentType<Task>> = new Array()
    for (let i = 0; i < this.tasks.length; i++) {
      let taskID = this.tasks[i]
      if (!taskID) continue

      TaskModel.findById(taskID).then((task) => {
        if (!task || task.isExpired || !task.expires) return
        if (this._isWeeklyTask(task)) dailyTasks.push(task)
      })
    }

    return dailyTasks
  }

  /** В случае, если количество еженедельных заданий меньше жвух, или не было сгенерировано задание на выполнение еженедельных заданий, удаляет их
   *  @returns true, если задания были удалены, false в противном случае
   */
  private _clearCurrentWeeklyTasksIfCountInvalid(this: DocumentType<TaskList>) {
    let weeklyTasks = this._findCurrentWeeklyTasks()
    if (weeklyTasks.length == 3) return false

    let promises = []
    for (let task of weeklyTasks) promises.push(task.delete())
    if (promises.length != 0) Promise.all(promises).then()
    return true
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
    let task = DYNAMIC_DATA.getRandomDaily(usedTasksNames)
    if (!task) return

    let data = TaskData.getDataFrom(task.data)

    let createdTask = await this._create(task.name, data.points)
    if (data.reward.mp && data.reward.mp > 0) createdTask.mp = data.reward.mp
    if (data.reward.exp && data.reward.exp > 0)
      createdTask.exp = data.reward.exp

    createdTask.expirationTime = {
      amount: 1,
      format: task.data.expirationType,
    }

    return createdTask
  }

  private async _createWeeklyTasks(this: DocumentType<TaskList>) {
    let usedNames: Array<string> = []
    let dailyTasks = []
    let promises = []
    let task

    while (dailyTasks.length != 3) {
      task = await this._createRandomWeeklyTask(usedNames)
      if (!task) return

      dailyTasks.push(task)
      usedNames.push(task.name)
      promises.push(task.save())
    }

    let completeWeeklyTasks = await this._createTaskToCompleteAllWeekly

    dailyTasks.push(completeWeeklyTasks)
    promises.push(completeWeeklyTasks.save())

    await Promise.all(promises)
    return dailyTasks
  }

  private async _createRandomWeeklyTask(
    this: DocumentType<TaskList>,
    usedTasksNames: Array<string>,
  ) {
    let task = DYNAMIC_DATA.getRandomWeekly(usedTasksNames)
    if (!task) return

    let data = TaskData.getDataFrom(task.data)

    let createdTask = await this._create(task.name, data.points)
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
      return this._create('completedDaily', data.points).then((task) => {
        if (data.reward.mp && data.reward.mp > 0) task.mp = data.reward.mp
        if (data.reward.exp && data.reward.exp > 0) task.exp = data.reward.exp

        task.expirationTime = {
          amount: 1,
          format: data.expirationType!,
        }

        return task
      })
    })
  }

  private get _createTaskToCompleteAllWeekly() {
    let data = STATIC_DATA.get('completedDaily')!
    return this._ownerName.then((username) => {
      return this._create('completedWeeky', data.points).then((task) => {
        if (data.reward.mp && data.reward.mp > 0) task.mp = data.reward.mp
        if (data.reward.exp && data.reward.exp > 0) task.exp = data.reward.exp

        task.expirationTime = {
          amount: 1,
          format: data.expirationType!,
        }
        return task
      })
    })
  }

  private async _create(taskName: string, requiredPoints: number) {
    let task = await TaskModel.create({
      owner: this.owner,
      name: taskName,
      progress: {
        currentPoints: 0,
        requiredPoints,
      },
    })
    this.tasks.push(task._id)
    return task
  }

  private _isDailyTask(task: DocumentType<Task>) {
    if (!task.expires || task.expires.expirationType != 'day') return false
    return true
  }

  private _isWeeklyTask(task: DocumentType<Task>) {
    if (!task.expires || task.expires.expirationType != 'week') return false
    return true
  }

  private get _ownerName() {
    return UserModel.findById(this.owner).then((user) => {
      if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
      return user.profile.username
    })
  }
}
