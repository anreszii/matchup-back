import { prop, ReturnModelType, DocumentType } from '@typegoose/typegoose'
import { MemberRecord } from './Member'
import type { Match as IMatch } from '../../Interfaces'
import { ImageModel } from '../Image'
import { MapScore } from './MapScore'
import { v4 as uuid } from 'uuid'
import { getRandom } from '../../Utils/math'
import { MatchListModel, UserModel } from '../index'
import { Statistic } from './Statistic'
import { TechnicalCause, TechnicalError } from '../../error'
import { ServiceInformation } from '../ServiceInformation'

export class Match {
  @prop({
    required: true,
    type: () => ServiceInformation,
    _id: false,
  })
  public info!: ServiceInformation
  @prop({ required: true })
  public game!: IMatch.Manager.supportedGames
  @prop({ required: true, default: [], type: () => MemberRecord, _id: false })
  public members!: MemberRecord[]
  @prop({ required: true, _id: false })
  public score!: MapScore
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
      info: new ServiceInformation(),
    })
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
    let image = await ImageModel.findById(ID)
    if (!image) throw new TechnicalError('image', TechnicalCause.NOT_EXIST)
    if (this.screen) ImageModel.erase(this.screen)

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
