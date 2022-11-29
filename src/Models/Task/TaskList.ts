import { prop, Ref, DocumentType, ReturnModelType } from '@typegoose/typegoose'
import { Types } from 'mongoose'
import {
  DynamicTaskModel,
  StaticTaskModel,
  STATIC_TASK,
  UserModel,
} from '../index'
import { TaskData } from './TaskData'
import { User } from '../User/User'
import { Task } from './Task'
import { TaskModel } from '../'
import {
  ServerCause,
  ServerError,
  TechnicalCause,
  TechnicalError,
} from '../../error'
import { Reward } from '../Reward'
import { expType } from './ExpirationTime'

export class TaskList {
  @prop({ required: true, ref: () => User })
  owner!: Ref<User>
  @prop({ required: true, ref: () => Task, default: [] })
  tasks!: Ref<Task>[]

  public static async getForUser(
    this: ReturnModelType<typeof TaskList>,
    user: User | Types.ObjectId | string,
  ) {
    let userDocument: DocumentType<User> | null
    if (typeof user == 'string')
      userDocument = await UserModel.findByName(user)!
    else userDocument = await UserModel.findById(user)!
    if (!userDocument)
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    let result = await this._checkUserList(userDocument)
    if (result) return this._loadTasksFromID(result)

    let tasks = await this.create({ owner: userDocument, tasks: [] })
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
    let wasCleared = await this._clearCurrentDailyTasksIfCountInvalid()
    if (!wasCleared) return this._findCurrentDailyTasks()

    let tasks = await this._createDailyTasks()
    if (!tasks)
      throw new TechnicalError('daily task list', TechnicalCause.CAN_NOT_ADD)

    return tasks
  }

  public async getWeekly(this: DocumentType<TaskList>) {
    let wasCleared = await this._clearCurrentWeeklyTasksIfCountInvalid()
    if (!wasCleared) return this._findCurrentWeeklyTasks()

    let tasks = await this._createWeeklyTasks()
    if (!tasks)
      throw new TechnicalError('weekly task list', TechnicalCause.CAN_NOT_ADD)

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

  public async getCompletedWeeklyTasksCount(this: DocumentType<TaskList>) {
    let weekly = await this.getWeekly()
    let counter = 0

    for (let task of weekly)
      if (task.isComplete && task.name != 'completedWeekly') counter++

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

    user.addMP(collectedReward.mp)
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
    let taskRewards: Reward[] | undefined
    for (let task of daily) {
      if (!task.isComplete) continue

      taskRewards = await task.complete()
      if (!taskRewards) continue
      rewards.push(taskRewards)
    }
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

    user.addMP(collectedReward.mp)
    await user.save()

    return collectedReward
  }

  public async createTask(
    this: DocumentType<TaskList>,
    name: string,
    expType: expType,
  ) {
    let data: STATIC_TASK | undefined

    let DynamicSet = await DynamicTaskModel.getType(name, expType)
    let StaticSet = await StaticTaskModel.getType(name, expType)
    if (DynamicSet) data = TaskData.getDataFrom(DynamicSet)
    else if (StaticSet) data = StaticSet
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
    return Promise.all([list.getDaily(), list.getWeekly()])
  }

  private static async _checkUserList(
    this: ReturnModelType<typeof TaskList>,
    owner: DocumentType<User> | Types.ObjectId,
  ) {
    let user = await this.findOne({ owner })
    return user
  }

  /** В случае, если количество ежедневных заданий меньше трех, или не было сгенерировано задание на выполнение ежедневных заданий, удаляет их
   *  @returns true, если задания были удалены, false в противном случае
   */
  private async _clearCurrentDailyTasksIfCountInvalid(
    this: DocumentType<TaskList>,
  ) {
    let correctTaskCount = (await this._getCorrectTaskCount()).day
    if (correctTaskCount > 1) correctTaskCount++ //если ежедневное не одно, то будет существовать результирующее задание

    let dailyTasks = await this._findCurrentDailyTasks()
    if (dailyTasks.length == correctTaskCount) return false

    let promises = []
    for (let task of dailyTasks) promises.push(task.delete())
    if (promises.length != 0) await Promise.all(promises)
    return true
  }

  private async _findCurrentDailyTasks(this: DocumentType<TaskList>) {
    let dailyTasks: Array<DocumentType<Task>> = new Array()
    for (let i = 0; i < this.tasks.length; i++) {
      let taskID = this.tasks[i]
      if (!taskID) continue

      let task = await TaskModel.findById(taskID)
      if (!task || task.isExpired || !task.expires) continue
      if (this._isDailyTask(task)) dailyTasks.push(task)
    }

    return dailyTasks
  }

  /** В случае, если количество еженедельных заданий меньше жвух, или не было сгенерировано задание на выполнение еженедельных заданий, удаляет их
   *  @returns true, если задания были удалены, false в противном случае
   */
  private async _clearCurrentWeeklyTasksIfCountInvalid(
    this: DocumentType<TaskList>,
  ) {
    let correctTaskCount = (await this._getCorrectTaskCount()).week
    let weeklyTasks = await this._findCurrentWeeklyTasks()
    if (weeklyTasks.length == correctTaskCount) return false

    let promises = []
    for (let task of weeklyTasks) promises.push(task.delete())
    if (promises.length != 0) await Promise.all(promises)
    return true
  }

  private async _findCurrentWeeklyTasks(this: DocumentType<TaskList>) {
    let dailyTasks: Array<DocumentType<Task>> = new Array()
    for (let i = 0; i < this.tasks.length; i++) {
      let taskID = this.tasks[i]
      if (!taskID) continue

      let task = await TaskModel.findById(taskID)
      if (!task || task.isExpired || !task.expires) continue
      if (this._isWeeklyTask(task)) dailyTasks.push(task)
    }

    return dailyTasks
  }

  private async _createDailyTasks(this: DocumentType<TaskList>) {
    let correctTaskCount = (await this._getCorrectTaskCount()).day
    let usedNames: Array<string> = []
    let dailyTasks = []
    let promises = []
    let task

    while (dailyTasks.length != correctTaskCount) {
      task = await this._createRandomDailyTask(usedNames)

      dailyTasks.push(task)
      usedNames.push(task.name)
      promises.push(task.save())
    }

    if (correctTaskCount > 1) {
      let completeDailyTask = await this._createTaskToCompleteAllDaily()
      if (!completeDailyTask)
        throw new ServerError(ServerCause.FAIL_TASK_GENERATION)

      dailyTasks.push(completeDailyTask)
      promises.push(completeDailyTask.save())
    }

    await Promise.all(promises)
    return dailyTasks
  }

  private async _createRandomDailyTask(
    this: DocumentType<TaskList>,
    usedTasksNames: Array<string>,
  ) {
    let task = await DynamicTaskModel.getRandomDaily(usedTasksNames)
    if (!task)
      throw new TechnicalError('day task', TechnicalCause.CAN_NOT_CREATE)

    let data = TaskData.getDataFrom(task.data)

    let createdTask = this._create(task.name, data.points)
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
    let correctTaskCount = (await this._getCorrectTaskCount()).week
    let usedNames: Array<string> = []
    let weekTasks = []
    let promises = []
    let task

    while (weekTasks.length != correctTaskCount) {
      task = await this._createRandomWeeklyTask(usedNames)

      weekTasks.push(task)
      usedNames.push(task.name)
      promises.push(task.save())
    }

    await Promise.all(promises)
    return weekTasks
  }

  private async _createRandomWeeklyTask(
    this: DocumentType<TaskList>,
    usedTasksNames: Array<string>,
  ) {
    let task = await DynamicTaskModel.getRandomWeekly(usedTasksNames)
    if (!task)
      throw new TechnicalError('week task', TechnicalCause.CAN_NOT_CREATE)

    let data = TaskData.getDataFrom(task.data)

    let createdTask = this._create(task.name, data.points)
    if (data.reward.mp && data.reward.mp > 0) createdTask.mp = data.reward.mp
    if (data.reward.exp && data.reward.exp > 0)
      createdTask.exp = data.reward.exp

    createdTask.expirationTime = {
      amount: 1,
      format: task.data.expirationType,
    }

    return createdTask
  }

  private async _getCorrectTaskCount(this: DocumentType<TaskList>) {
    switch (await this._ownerIsPremium()) {
      case true:
        return { week: 2, day: 3 }
      case false:
        return { week: 1, day: 1 }
    }
  }

  private async _createTaskToCompleteAllDaily(this: DocumentType<TaskList>) {
    let data = await StaticTaskModel.getType('completedDaily')
    if (!data) return null

    let task = this._create('completedDaily', data.points)

    if (data.reward.mp && data.reward.mp > 0) task.mp = data.reward.mp
    if (data.reward.exp && data.reward.exp > 0) task.exp = data.reward.exp

    task.expirationTime = {
      amount: 1,
      format: data.expirationType!,
    }

    task.flags.static = true
    return task
  }

  private async _getOwnerName(this: DocumentType<TaskList>) {
    return (await this._getOwner()).profile.username
  }

  private async _ownerIsPremium(this: DocumentType<TaskList>) {
    return (await this._getOwner()).isPremium()
  }

  private async _getOwner(this: DocumentType<TaskList>) {
    let owner = await UserModel.findById(this.owner)
    if (!owner) {
      this.delete()
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    }

    return owner
  }

  private _create(taskName: string, requiredPoints: number) {
    let task = new TaskModel()
    task.owner = this.owner
    task.name = taskName
    task.progress = {
      currentPoints: 0,
      requiredPoints,
    }

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
}
