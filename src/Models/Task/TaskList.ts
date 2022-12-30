import { prop, Ref, DocumentType, ReturnModelType } from '@typegoose/typegoose'
import { RefType, Types } from 'mongoose'
import {
  DynamicTaskModel,
  StaticTaskModel,
  STATIC_TASK,
  UserModel,
  DynamicTask,
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
  private static _cacheOwners: Map<Ref<User>, DocumentType<User>> = new Map()

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

    let tasks = await this.create({ owner: userDocument._id, tasks: [] })
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

    this._getOwner()
      .then((user) => {
        if (user) user.notify('Ежедневные задания обновлены')
      })
      .catch((e) => {
        throw e
      })
    return tasks
  }

  public async getWeekly(this: DocumentType<TaskList>) {
    let wasCleared = await this._clearCurrentWeeklyTasksIfCountInvalid()
    if (!wasCleared) return this._findCurrentWeeklyTasks()

    let tasks = await this._createWeeklyTasks()
    if (!tasks)
      throw new TechnicalError('weekly task list', TechnicalCause.CAN_NOT_ADD)

    const user = await this._getOwner()
    user.notify('Еженедельные задания обновлены')
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

  private static async _loadTasksFromID(
    this: ReturnModelType<typeof TaskList>,
    list: DocumentType<TaskList>,
  ) {
    return Promise.all([list.getDaily(), list.getWeekly()])
      .then(async (tasks) => {
        list.save()
        return tasks
      })
      .catch((e) => {
        throw e
      })
  }

  private static async _checkUserList(
    this: ReturnModelType<typeof TaskList>,
    owner: DocumentType<User> | Types.ObjectId,
  ) {
    return this.findOne({ owner })
  }

  /** В случае, если количество ежедневных заданий меньше трех, или не было сгенерировано задание на выполнение ежедневных заданий, удаляет их
   *  @returns true, если задания были удалены, false в противном случае
   */
  private async _clearCurrentDailyTasksIfCountInvalid(
    this: DocumentType<TaskList>,
  ) {
    const [correctTaskCount, tasks] = await Promise.all([
      this._getCorrectTaskCount(),
      this._findCurrentDailyTasks(),
    ])
    if (tasks.length == correctTaskCount.day) return false

    let promises = []
    for (let task of tasks) promises.push(task.delete())
    if (promises.length != 0) await Promise.all(promises)
    return true
  }

  private async _findCurrentDailyTasks(this: DocumentType<TaskList>) {
    const result: DocumentType<Task>[] = []
    return TaskModel.find({
      _id: this.tasks,
    })
      .then((userTasks) => {
        for (let task of userTasks) {
          if (!task || task.isExpired || !task.expires) continue
          if (this._isCurrentDailyTask(task)) result.push(task)
        }
        return result
      })
      .catch((e) => {
        throw e
      })
  }

  /** В случае, если количество еженедельных заданий меньше жвух, или не было сгенерировано задание на выполнение еженедельных заданий, удаляет их
   *  @returns true, если задания были удалены, false в противном случае
   */
  private async _clearCurrentWeeklyTasksIfCountInvalid(
    this: DocumentType<TaskList>,
  ) {
    const [correctTaskCount, tasks] = await Promise.all([
      this._getCorrectTaskCount(),
      this._findCurrentWeeklyTasks(),
    ])
    if (tasks.length == correctTaskCount.week) return false

    let promises = []
    for (let task of tasks) promises.push(task.delete())
    if (promises.length != 0) await Promise.all(promises)
    return true
  }

  private async _findCurrentWeeklyTasks(this: DocumentType<TaskList>) {
    const result: DocumentType<Task>[] = []
    return TaskModel.find({
      _id: this.tasks,
    })
      .then((tasks) => {
        for (let task of tasks) {
          if (!task || task.isExpired || !task.expires) continue
          if (this._isCurrentWeeklyTask(task)) result.push(task)
        }
        return result
      })
      .catch((e) => {
        throw e
      })
  }

  private async _createDailyTasks(this: DocumentType<TaskList>) {
    let correctTaskCount = (await this._getCorrectTaskCount()).day
    let usedNames: Array<string> = []
    let dailyTasks = []
    let promises = []
    let result
    let types: undefined | DocumentType<DynamicTask>[]

    while (dailyTasks.length != correctTaskCount) {
      result = await this._createRandomDailyTask(usedNames)
      if (!types) types = result.types

      dailyTasks.push(result.task)
      usedNames.push(result.task.name)
      promises.push(result.task.save())
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
    types?: DocumentType<DynamicTask>[],
  ) {
    let task = await DynamicTaskModel.getRandomDaily(usedTasksNames, types)
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

    return { task: createdTask, types: task.types }
  }

  private async _createWeeklyTasks(this: DocumentType<TaskList>) {
    let correctTaskCount = (await this._getCorrectTaskCount()).week
    let usedNames: Array<string> = []
    let weekTasks = []
    let promises = []
    let result
    let types: undefined | DocumentType<DynamicTask>[]

    while (weekTasks.length != correctTaskCount) {
      result = await this._createRandomWeeklyTask(usedNames, types)
      if (!types) types = result.types

      weekTasks.push(result.task)
      usedNames.push(result.task.name)
      promises.push(result.task.save())
    }

    await Promise.all(promises)
    return weekTasks
  }

  private async _createRandomWeeklyTask(
    this: DocumentType<TaskList>,
    usedTasksNames: Array<string>,
    types?: DocumentType<DynamicTask>[],
  ) {
    let task = await DynamicTaskModel.getRandomWeekly(usedTasksNames, types)
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

    return { task: createdTask, types: task.types }
  }

  private async _getCorrectTaskCount(this: DocumentType<TaskList>) {
    return this._ownerIsPremium()
      .then((status) => {
        switch (status) {
          case true:
            return { week: 2, day: 3 }
          case false:
            return { week: 1, day: 1 }
        }
      })
      .catch((e) => {
        throw e
      })
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
    return this._getOwner()
      .then((owner) => {
        return owner.profile.username
      })
      .catch((e) => {
        throw e
      })
  }

  private async _ownerIsPremium(this: DocumentType<TaskList>) {
    return this._getOwner()
      .then((owner) => {
        return owner.isPremium()
      })
      .catch((e) => {
        throw e
      })
  }

  private async _getOwner(this: DocumentType<TaskList>) {
    if (TaskList._cacheOwners.has(this.owner))
      return TaskList._cacheOwners.get(this.owner)!
    return UserModel.findById(this.owner)
      .then((owner) => {
        if (!owner) {
          this.delete()
          throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
        }

        TaskList._cacheOwners.set(this.owner, owner)
        return owner
      })
      .catch((e) => {
        throw e
      })
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

  private _isCurrentDailyTask(task: DocumentType<Task>) {
    if (!task.expires || task.expires.expirationType != 'day') return false
    return true
  }

  private _isCurrentWeeklyTask(task: DocumentType<Task>) {
    if (!task.expires || task.expires.expirationType != 'week') return false
    return true
  }
}
