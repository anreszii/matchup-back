import { prop, Ref, DocumentType, ReturnModelType } from '@typegoose/typegoose'
import { Types } from 'mongoose'
import {
  DynamicTaskModel,
  StaticTaskModel,
  UserModel,
  DynamicTask,
} from '../index'
import { TaskData } from './TaskData'
import { User } from '../User/User'
import { Task } from './Task'
import { TaskModel } from '..'
import {
  ServerCause,
  ServerError,
  TechnicalCause,
  TechnicalError,
} from '../../error'

type LoadedTasks = {
  hasDaily: boolean
  hasWeekly: boolean
  weekly: DocumentType<Task>[]
  daily: DocumentType<Task>[]
}

export class TaskList {
  @prop({ required: true, ref: () => User })
  owner!: Ref<User>
  @prop({ required: true, ref: () => Task, default: [] })
  tasks!: Ref<Task>[]
  private static _cacheOwners: Map<Ref<User>, DocumentType<User>> = new Map()

  constructor() {}

  static async getForUser(
    this: ReturnModelType<typeof TaskList>,
    user: string,
  ) {
    return this._getListOfUser(user).then((list) => {
      return this._loadCurrentTasksFromList(list as DocumentType<TaskList>)
    })
  }

  static deleteForUser(
    this: ReturnModelType<typeof TaskList>,
    owner: string,
  ): Promise<unknown> {
    return this._getListOfUser(owner, false).then((list) => {
      if (!list) return
      return list.clear().then(() => {
        return list.delete()
      })
    })
  }

  private static async _getListOfUser(
    this: ReturnModelType<typeof TaskList>,
    user: User | Types.ObjectId | string,
    createIfNull = true,
  ) {
    let userDocument: DocumentType<User> | null
    if (typeof user == 'string')
      userDocument = await UserModel.findByName(user)!
    else userDocument = await UserModel.findById(user)!
    if (!userDocument)
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    return this.findOne({ owner: userDocument }).then((list) => {
      if (!list && createIfNull)
        return this.create({ owner: userDocument, tasks: [] })
      return list
    })
  }

  private static async _loadCurrentTasksFromList(
    this: ReturnModelType<typeof TaskList>,
    list: DocumentType<TaskList>,
  ): Promise<DocumentType<Task>[]> {
    return list
      ._getCurrentTasks()
      .then((tasks) => {
        list.save()
        return [...tasks.daily, ...tasks.weekly]
      })
      .catch((e) => {
        throw e
      })
  }

  //TODO доделать оптимизацию удаления данных документа
  clear(this: DocumentType<TaskList>): Promise<void> {
    return TaskModel.find({ _id: this.tasks }).then((tasks) => {
      if (!tasks) return
      this._deleteTasks(tasks).then(() => {
        return this.save().then(() => undefined)
      })
    })
  }

  getCompletedDailyTasksCount(this: DocumentType<TaskList>) {
    return this._getCurrentTasks().then((loadedTasks) => {
      let counter = 0
      for (let task of loadedTasks.daily)
        if (task.isComplete && task.name != 'completedWeekly') counter++

      return counter
    })
  }

  getCompletedWeeklyTasksCount(this: DocumentType<TaskList>) {
    return this._getCurrentTasks().then((loadedTasks) => {
      let counter = 0
      for (let task of loadedTasks.weekly)
        if (task.isComplete && task.name != 'completedWeekly') counter++

      return counter
    })
  }

  private _getCurrentTasks(this: DocumentType<TaskList>): Promise<LoadedTasks> {
    return this._loadCurrentTasks().then(async (loadedTasks) => {
      if (!loadedTasks.hasDaily)
        loadedTasks.daily = await this._createDailyTasks()
      if (!loadedTasks.hasWeekly)
        loadedTasks.weekly = await this._createWeeklyTasks()

      loadedTasks.hasDaily = true
      loadedTasks.hasWeekly = true
      return loadedTasks
    })
  }

  private _loadCurrentTasks(
    this: DocumentType<TaskList>,
  ): Promise<LoadedTasks> {
    return Promise.all([
      this._getCorrectTaskCount(),
      this._findCurrentTasks(),
    ]).then(([correctTasksCount, currentTasks]) => {
      const weeklyTasks = []
      const dailyTasks = []
      for (let task of currentTasks) {
        if (!task.expires) continue
        switch (task.expires.expirationType) {
          case 'day':
            dailyTasks.push(task)
            break
          case 'week':
            weeklyTasks.push(task)
            break
        }
      }

      const result: LoadedTasks = {
        hasDaily: true,
        hasWeekly: true,
        weekly: weeklyTasks,
        daily: dailyTasks,
      }

      if (correctTasksCount.day > 1) correctTasksCount.day += 1
      if (dailyTasks.length != correctTasksCount.day) {
        this._deleteTasks(dailyTasks)
        result.hasDaily = false
        result.daily = []
      }
      if (weeklyTasks.length != correctTasksCount.week) {
        this._deleteTasks(weeklyTasks)
        result.hasWeekly = false
        result.weekly = []
      }

      return result
    })
  }

  private _deleteTasks(tasks: DocumentType<Task>[]) {
    const promises = []
    for (let task of tasks) {
      promises.push(task.delete())
      if (~this.tasks.indexOf(task.id))
        this.tasks.splice(this.tasks.indexOf(task.id), 1)
    }
    return Promise.all(promises)
      .then(() => true)
      .catch((e) => {
        console.error(e)
      })
  }

  private async _findCurrentTasks(this: DocumentType<TaskList>) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return TaskModel.find({
      _id: this.tasks,
      'expires.expirationDate': { $gte: today },
    })
  }

  private async _createDailyTasks(
    this: DocumentType<TaskList>,
  ): Promise<DocumentType<Task>[]> {
    let correctTaskCount = (await this._getCorrectTaskCount()).day
    let usedNames: Array<string> = []
    let generatedTasks: DocumentType<Task>[] = []
    let promises = []
    let result
    let types: undefined | DocumentType<DynamicTask>[]

    while (generatedTasks.length != correctTaskCount) {
      result = await this._createRandomDailyTask(usedNames)
      if (!types) types = result.types

      generatedTasks.push(result.task)
      usedNames.push(result.task.name)
      promises.push(result.task.save())
    }

    if (correctTaskCount > 1)
      this._createTaskToCompleteAllDaily().then((completeDailyTask) => {
        if (!completeDailyTask)
          throw new ServerError(ServerCause.FAIL_TASK_GENERATION)

        generatedTasks.push(completeDailyTask)
        promises.push(completeDailyTask.save())
      })

    return Promise.all(promises)
      .then(() => {
        this._getOwner()
          .then((user) => {
            if (user) user.notify('Ежедневные задания обновлены')
          })
          .catch((e) => {
            throw e
          })
        return generatedTasks
      })
      .catch((e) => {
        throw e
      })
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

  private _createTaskToCompleteAllDaily(
    this: DocumentType<TaskList>,
  ): Promise<DocumentType<Task> | null> {
    return StaticTaskModel.getType('completedDaily').then((data) => {
      if (!data)
        throw new TechnicalError('week task', TechnicalCause.CAN_NOT_CREATE)
      const task = this._create('completedDaily', data.points)

      if (data.reward.mp && data.reward.mp > 0) task.mp = data.reward.mp
      if (data.reward.exp && data.reward.exp > 0) task.exp = data.reward.exp

      task.expirationTime = {
        amount: 1,
        format: data.expirationType!,
      }

      task.flags.static = true
      return task
    })
  }

  private async _createWeeklyTasks(
    this: DocumentType<TaskList>,
  ): Promise<DocumentType<Task>[]> {
    let correctTaskCount = (await this._getCorrectTaskCount()).week
    let usedNames: Array<string> = []
    let generatedTasks: DocumentType<Task>[] = []
    let promises = []
    let result
    let types: undefined | DocumentType<DynamicTask>[]

    while (generatedTasks.length != correctTaskCount) {
      result = await this._createRandomWeeklyTask(usedNames, types)
      if (!types) types = result.types

      generatedTasks.push(result.task)
      usedNames.push(result.task.name)
      promises.push(result.task.save())
    }

    return Promise.all(promises)
      .then(() => {
        this._getOwner()
          .then((user) => {
            if (user) user.notify('Еженедельные задания обновлены')
          })
          .catch((e) => {
            throw e
          })
        return generatedTasks
      })
      .catch((e) => {
        throw e
      })
  }

  private _createRandomWeeklyTask(
    this: DocumentType<TaskList>,
    usedTasksNames: Array<string>,
    types?: DocumentType<DynamicTask>[],
  ) {
    return DynamicTaskModel.getRandomWeekly(usedTasksNames, types).then(
      (task) => {
        if (!task)
          throw new TechnicalError('week task', TechnicalCause.CAN_NOT_CREATE)

        const data = TaskData.getDataFrom(task.data)
        const createdTask = this._create(task.name, data.points)

        if (data.reward.mp && data.reward.mp > 0)
          createdTask.mp = data.reward.mp
        if (data.reward.exp && data.reward.exp > 0)
          createdTask.exp = data.reward.exp

        createdTask.expirationTime = {
          amount: 1,
          format: task.data.expirationType,
        }

        return { task: createdTask, types: task.types }
      },
    )
  }

  private _getCorrectTaskCount(
    this: DocumentType<TaskList>,
  ): Promise<{ week: number; day: number }> {
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

  private _ownerIsPremium(this: DocumentType<TaskList>): Promise<boolean> {
    return this._getOwner()
      .then((owner) => {
        return owner.is_premium()
      })
      .catch((e) => {
        throw e
      })
  }

  private _getOwner(this: DocumentType<TaskList>): Promise<DocumentType<User>> {
    if (TaskList._cacheOwners.has(this.owner))
      return Promise.resolve(TaskList._cacheOwners.get(this.owner)!)
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
}
