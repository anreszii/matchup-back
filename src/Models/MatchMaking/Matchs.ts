import { Match as IMatch } from '../../Interfaces'
import { prop, ReturnModelType, DocumentType } from '@typegoose/typegoose'
import { MemberRecord } from './Member'
import { MapScore } from './MapScore'
import { v4 as uuid } from 'uuid'
import { getRandom } from '../../Utils/math'
import { MatchListModel, Task, TaskListModel, User, UserModel } from '../index'
import {
  ServerCause,
  ServerError,
  TechnicalCause,
  TechnicalError,
} from '../../error'
import { ServiceInformation } from '../ServiceInformation'
import { Reward } from '../Reward'
import { CachedLobbies } from '../../Classes/MatchMaking/LobbyCache'
import { fetchWebSocket } from '../../Utils/dataHookSocket'
const socket = new fetchWebSocket('ws://217.25.93.43:6666/')

export class MatchServiceInformation extends ServiceInformation {
  constructor(lobbyID: string) {
    super()
    this.lobby = lobbyID
  }
  @prop()
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

  static async log(
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

  async getLoggedNames(this: DocumentType<Match>) {
    const lobbyMembers = await CachedLobbies.get(this.info.lobby)
    if (lobbyMembers) return lobbyMembers.cached

    const names = []
    for (let member of this.members) names.push(member.name)
    return names
  }

  async getParsedNames(this: DocumentType<Match>, customNicknames?: string[]) {
    try {
      const nicknamesInLobby = []
      const nicknamesToParse = []

      if (!customNicknames) {
        const membersInLobby = await CachedLobbies.get(this.info.lobby)
        if (!membersInLobby)
          throw new ServerError(ServerCause.UNKNOWN_ERROR, 'parse nicknames')
        for (let member of membersInLobby.cached)
          nicknamesInLobby.push(member.nickname)
      } else nicknamesInLobby.push(...customNicknames)

      for (let member of this.members) nicknamesToParse.push(member.name)
      return socket.fetch({
        inLobby: nicknamesInLobby,
        toParse: nicknamesToParse,
        cutOff: 5,
      })
    } catch (e) {
      console.log(e)
    }
  }

  async calculateResults(this: DocumentType<Match>) {
    const names: string[] = []
    for (let member of this.members) names.push(member.name)
    const users = await UserModel.find({ 'profile.username': names })

    const taskCheckPromises = []
    let counter = 0
    for (let user of users) {
      let member = this.members.find(
        (member) => user.profile.username == member.name,
      )
      if (member) counter++
    }
    if (counter != 10)
      throw new TechnicalError('members count', TechnicalCause.INVALID)
    for (let user of users) {
      let member = this.members.find(
        (member) => user.profile.username == member.name,
      )
      if (!member) throw new TechnicalError('member', TechnicalCause.INVALID)
      let result = this._resultOfMatchForMember(user.profile.username)
      let ratingChange = user.rating.integrate(member.statistic, result)

      member.image = user.profile.avatar
      member.ratingChange = ratingChange

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
    await this.save()
    await CachedLobbies.delete(this.info.lobby)
  }

  async addRecords(this: DocumentType<Match>, ...records: MemberRecord[]) {
    this.members = [...this.members, ...records]
    return this.save()
  }

  async changeRecordName(
    this: DocumentType<Match>,
    pairs: { old: string; new: string }[],
  ) {
    for (let pair of pairs) {
      let member = this.members.find((member) => member.name == pair.old)
      if (!member) continue
      member.name = pair.new
    }
    return this.save()
  }

  async changeRecord(
    this: DocumentType<Match>,
    updateOfMembers: Partial<Exclude<MemberRecord, 'image' | 'ratingChange'>>[],
  ) {
    for (let updatedMember of updateOfMembers) {
      if (!updatedMember.name) continue
      let member = this.members.find(
        (member) => member.name == updatedMember.name,
      )
      if (!member) continue

      if (updatedMember.command) member.command = updatedMember.command
      if (updatedMember.statistic) {
        const statistic = updatedMember.statistic
        if (statistic.kills) member.statistic.kills = statistic.kills
        if (statistic.deaths) member.statistic.deaths = statistic.deaths
        if (statistic.assists) member.statistic.assists = statistic.assists
        if (statistic.points) member.statistic.points = statistic.points
      }
    }
    return this.save()
  }

  async setScreen(this: DocumentType<Match>, ID: string) {
    this.screen = ID
    await this.save()

    return true
  }

  static async generateTestData(
    this: ReturnModelType<typeof Match>,
    testDocumentsCount: number = 3,
  ) {
    let records = []
    for (let i = 1; i < testDocumentsCount + 1; i++)
      records.push(await this._generateTestDocument())

    return records
  }

  static async getTestData(this: ReturnModelType<typeof Match>) {
    return this.find({
      'score.mapName': 'testMap',
    })
  }

  static async deleteTestData(this: ReturnModelType<typeof Match>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
    return true
  }

  static async _generateTestDocument(this: ReturnModelType<typeof Match>) {
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
    if (!winnerIsFirstCommand && member.command == 'command2')
      return IMatch.Result.WIN

    return IMatch.Result.LOSE
  }

  private async _checkTasksForUser(user: DocumentType<User>) {
    const member = this.members.find(
      (value) => value.name == user.profile.username,
    )
    if (!member) throw new TechnicalError('member', TechnicalCause.REQUIRED)

    return TaskListModel.getForUser(user._id)
      .then(async (tasks) => {
        user.addMP(
          this._getMpFromRewards(await this._checkTasks(tasks, member)),
        )
        return true
      })
      .catch((e) => {
        console.error(e)
      })
  }

  //TODO оптимизировать коллект тасков
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
      case 'Убийств|Kills':
        task.addProgess(member.statistic.kills)
        break
      case 'Побед|Wins':
        if (this._resultOfMatchForMember(member.name) == IMatch.Result.WIN)
          task.addProgess(1)
        break
      case 'Набрать очков|Gained points':
        task.addProgess(member.statistic.points)
        break
      case 'Сделать ассистов|Assists':
        task.addProgess(member.statistic.assists)
        break
      case 'Сыграть|Matches played':
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
