import { prop, ReturnModelType, DocumentType, Ref } from '@typegoose/typegoose'
import { MemberRecord } from './Member'
import type { Match } from '../../Interfaces'
import { ImageModel } from '../Image'
import { MapScore } from './MapScore'
import { v4 } from 'uuid'
import { getRandom } from '../../Utils/math'
import { MatchListModel, UserModel } from '../index'
import { Statistic } from './Statistic'
import { TechnicalCause, TechnicalError } from '../../error'

export class MatchList {
  @prop({ required: true, unique: true })
  public id!: string
  @prop({ required: true })
  public game!: Match.Manager.supportedGames
  @prop({ required: true, default: [], type: () => MemberRecord, _id: false })
  public members!: MemberRecord[]
  @prop({ required: true, _id: false })
  public score!: MapScore
  @prop()
  public screen?: string

  public static log(
    this: ReturnModelType<typeof MatchList>,
    id: string,
    game: string,
    members: MemberRecord[],
    score: MapScore,
    image?: string,
  ) {
    let document = new this({ id, game, members, score, screen: image })
    return document.save()
  }

  async addRecords(this: DocumentType<MatchList>, ...records: MemberRecord[]) {
    this.members = [...this.members, ...records]
    return this.save()
  }

  async changeRecord(
    this: DocumentType<MatchList>,
    username: string,
    command?: Match.Lobby.Command.Types,
    statistic?: Statistic,
  ) {
    let member = this.members.find((member) => member.name == username)
    if (!member)
      throw new TechnicalError('member record', TechnicalCause.NOT_EXIST)

    if (command) member.command = command

    if (statistic) member.statistic = statistic

    return this.save()
  }

  async setScreen(this: DocumentType<MatchList>, ID: string) {
    let image = await ImageModel.findById(ID)
    if (!image) throw new TechnicalError('image', TechnicalCause.NOT_EXIST)

    this.screen = ID
    await this.save()

    return true
  }

  public static async generateTestData(
    this: ReturnModelType<typeof MatchList>,
    testDocumentsCount: number = 3,
  ) {
    let records = []
    for (let i = 1; i < testDocumentsCount + 1; i++)
      records.push(await this._generateTestDocument())

    return records
  }

  public static async getTestData(this: ReturnModelType<typeof MatchList>) {
    return this.find({
      'score.mapName': 'testMap',
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof MatchList>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
    return true
  }

  private static async _generateTestDocument(
    this: ReturnModelType<typeof MatchList>,
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
    let id = v4()
    while (await MatchListModel.findOne({ id })) id = v4()
    return id
  }

  private async _fullFillWithTestData(this: DocumentType<MatchList>) {
    let testUsers = await UserModel.getTestData()
    if (testUsers.length < 10)
      testUsers = await UserModel.generateTestData(10, false)
    for (let membersCount = 0; membersCount < 10; membersCount++) {
      let user = testUsers[membersCount]
      if (membersCount < 5)
        this.members.push({
          name: user.profile.username,
          command: 'command1',
          statistic: { kills: 0, deaths: 0, assists: 0 },
        })
      else
        this.members.push({
          name: user.profile.username,
          command: 'command2',
          statistic: { kills: 0, deaths: 0, assists: 0 },
        })
    }
  }
}
