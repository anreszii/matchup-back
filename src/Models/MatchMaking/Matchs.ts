import { prop, ReturnModelType, DocumentType } from '@typegoose/typegoose'
import { MemberRecord } from './Member'
import { Match as IMatch } from '../../Interfaces'
import { MapScore } from './MapScore'
import { v4 as uuid } from 'uuid'
import { getRandom } from '../../Utils/math'
import { MatchListModel, Task, TaskListModel, User, UserModel } from '../index'
import { Statistic } from './Statistic'
import { TechnicalCause, TechnicalError } from '../../error'
import { ServiceInformation } from '../ServiceInformation'
import { Reward } from '../Reward'

export class MatchServiceInformation extends ServiceInformation {
  constructor(lobbyID: string) {
    super()
    this.lobby = lobbyID
  }
  @prop({ required: true })
  lobby!: string
}

export class Match {
  @prop({
    required: true,
    type: () => MatchServiceInformation,
    _id: false,
  })
  public info!: MatchServiceInformation
  @prop({ required: true })
  public game!: IMatch.Manager.supportedGames
  @prop({ required: true, default: [], type: () => MemberRecord, _id: false })
  public members!: MemberRecord[]
  @prop({ _id: false })
  public score?: MapScore
  @prop()
  public screen?: string

  public static log(
    this: ReturnModelType<typeof Match>,
    id: string,
    game: string,
    members: MemberRecord[],
    score: MapScore,
    image?: string,
  ) {
    return this.create({
      id,
      game,
      members,
      score,
      screen: image,
      info: new MatchServiceInformation(id),
    })
  }

  async calculateResults(this: DocumentType<Match>) {
    const names: string[] = []
    for (let member of this.members) names.push(member.name)
    const users = await UserModel.find({ 'profile.username': names })

    const taskCheckPromises = []
    for (let user of users) {
      let statistic = this.members.find(
        (member) => user.profile.username == member.name,
      )!.statistic
      let result = this._resultOfMatchForMember(user.profile.username)
      let ratingChange = user.rating.integrate(statistic, result)

      taskCheckPromises.push(this._checkTasksForUser(user))

      switch (result) {
        case 0:
          user.notify(
            `Вы проиграли в игре ${this.info.id}. Изменение в рейтинге: ${ratingChange}`,
          )
          break
        case 0.5:
          user.notify(
            `У вас была ничья в игре ${this.info.id}. Изменение в рейтинге: ${ratingChange}`,
          )
          break
        case 1:
          user.notify(
            `Вы выиграли в игре ${this.info.id}. Изменение в рейтинге: ${ratingChange}`,
          )
          break
      }
    }

    const userSavePromises = []
    await Promise.all(taskCheckPromises)
    for (let user of users) userSavePromises.push(user.save())
    await Promise.all(userSavePromises)
  }

  async addRecords(this: DocumentType<Match>, ...records: MemberRecord[]) {
    this.members = [...this.members, ...records]
    return this.save()
  }

  async changeRecord(
    this: DocumentType<Match>,
    username: string,
    command?: IMatch.Lobby.Command.Types,
    statistic?: Statistic,
  ) {
    let member = this.members.find((member) => member.name == username)
    if (!member)
      throw new TechnicalError('member record', TechnicalCause.NOT_EXIST)

    if (command) member.command = command

    if (statistic) member.statistic = statistic

    return this.save()
  }

  async setScreen(this: DocumentType<Match>, ID: string) {
    this.screen = ID
    await this.save()

    return true
  }

  public static async generateTestData(
    this: ReturnModelType<typeof Match>,
    testDocumentsCount: number = 3,
  ) {
    let records = []
    for (let i = 1; i < testDocumentsCount + 1; i++)
      records.push(await this._generateTestDocument())

    return records
  }

  public static async getTestData(this: ReturnModelType<typeof Match>) {
    return this.find({
      'score.mapName': 'testMap',
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof Match>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
    return true
  }

  private static async _generateTestDocument(
    this: ReturnModelType<typeof Match>,
  ) {
    let score1 = getRandom(0, 16)
    let score2 = 0
    if (score1 != 16) {
      score2 = 30 - score1
    }
    let matchRecord = new this({
      id: await this.getRandomID(),
      game: 'StandOff2',
      score: {
        mapName: 'testMap',
        command1: score1,
        command2: score2,
      },
    })
    matchRecord._fullFillWithTestData()
    await matchRecord.save()
    return matchRecord
  }

  private static async getRandomID() {
    let id = uuid()
    while (await MatchListModel.findOne({ id })) id = uuid()
    return id
  }

  private async _fullFillWithTestData(this: DocumentType<Match>) {
    let testUsers = await UserModel.getTestData()
    if (testUsers.length < 10)
      testUsers = await UserModel.generateTestData(10, false)
    for (let membersCount = 0; membersCount < 10; membersCount++) {
      let user = testUsers[membersCount]
      if (membersCount < 5)
        this.members.push({
          name: user.profile.username,
          command: 'command1',
          statistic: { kills: 0, deaths: 0, assists: 0, points: 0 },
        })
      else
        this.members.push({
          name: user.profile.username,
          command: 'command2',
          statistic: { kills: 0, deaths: 0, assists: 0, points: 0 },
        })
    }
  }

  private _resultOfMatchForMember(name: string): IMatch.Result {
    if (this.score!.command1 == this.score!.command2) return IMatch.Result.DRAW

    const member = this.members.find((member) => member.name == name)
    if (!member) throw new TechnicalError('member', TechnicalCause.NOT_EXIST)

    const winnerIsFirstCommand = this.score!.command1 > this.score!.command2
    if (winnerIsFirstCommand && member.command == 'command1')
      return IMatch.Result.WIN
    return IMatch.Result.LOSE
  }

  private async _checkTasksForUser(user: DocumentType<User>) {
    const tasks: [DocumentType<Task>[], DocumentType<Task>[]] =
      await TaskListModel.getForUser(user._id)
    const member = this.members.find(
      (value) => value.name == user.profile.username,
    )
    if (!member) throw new TechnicalError('member', TechnicalCause.REQUIRED)

    const daily = tasks[0]
    const weekly = tasks[1]
    const promises = []

    promises.push(this._checkTasks(daily, member))
    promises.push(this._checkTasks(weekly, member))

    const result = await Promise.all(promises)
    const rewards = [...result[0], ...result[1]]

    user.addMP(this._getMpFromRewards(rewards))
    return true
  }

  private async _checkTasks(tasks: DocumentType<Task>[], member: MemberRecord) {
    const rewards: Array<Reward> = []
    for (let task of tasks) {
      this._addTaskProgress(task, member)
      let result = await task.complete()
      if (result) rewards.push(...result)
    }

    return rewards
  }

  private async _addTaskProgress(
    task: DocumentType<Task>,
    member: MemberRecord,
  ) {
    switch (task.name) {
      case 'Убить противников':
        task.addProgess(member.statistic.kills)
        break
      case 'Выиграть':
        if (this._resultOfMatchForMember(member.name) == IMatch.Result.WIN)
          task.addProgess(1)
        break
      case 'Набрать очков':
        task.addProgess(member.statistic.points)
        break
      case 'Ассистов':
        task.addProgess(member.statistic.assists)
        break
      case 'Сыграть':
        task.addProgess(1)
        break
      case 'Sandstone':
        if (this.score!.mapName == 'Sandstone') task.addProgess(1)
        break
      case 'Rust':
        if (this.score!.mapName == 'Rust') task.addProgess(1)
        break
      case 'Sakura':
        if (this.score!.mapName == 'Sakura') task.addProgess(1)
        break
      case 'Zone 9':
        if (this.score!.mapName == 'Zone 9') task.addProgess(1)
        break
      case 'Province':
        if (this.score!.mapName == 'Province') task.addProgess(1)
        break
    }
  }

  private _getMpFromRewards(rewards: Array<Reward>) {
    let acc = 0
    for (let reward of rewards) if (reward.type == 'mp') acc += reward.amount
    return acc
  }
}
