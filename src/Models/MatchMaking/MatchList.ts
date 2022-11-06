import { prop, ReturnModelType, DocumentType, Ref } from '@typegoose/typegoose'
import { MemberRecord } from './Member'
import type { Match } from '../../Interfaces'
import { Image, ImageModel } from '../Image'
import { MapScore } from './MapScore'
import { v4 } from 'uuid'
import { getRandom } from '../../Utils/math'
import { MatchListModel, UserModel } from '../index'
import { Statistic } from './Statistic'
import { validationCause, ValidationError } from '../../error'

export class MatchList {
  @prop({ required: true, unique: true })
  public id!: string
  @prop({ required: true })
  public game!: Match.Manager.supportedGames
  @prop({ required: true, default: [], type: () => MemberRecord, _id: false })
  public members!: MemberRecord[]
  @prop({ required: true, _id: false })
  public score!: MapScore
  @prop({ ref: () => Image })
  public screen?: Ref<Image>

  public static log(
    this: ReturnModelType<typeof MatchList>,
    id: string,
    game: string,
    members: MemberRecord[],
    score: MapScore,
    image?: Image,
  ) {
    let document = new this({ id, game, members, score, image })
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
      throw new ValidationError('member record', validationCause.NOT_EXIST)

    if (command) member.command = command

    if (statistic) member.statistic = statistic

    return this.save()
  }

  async setScreen(
    this: DocumentType<MatchList>,
    buffer: Buffer,
    mimeType: string,
  ) {
    this.screen = await ImageModel.create({
      buffer,
      mimeType,
    })

    return this.save()
  }

  public static async generateTestData(
    this: ReturnModelType<typeof MatchList>,
    testDocumentsCount: number = 3,
  ) {
    let generatedDocuments: DocumentType<MatchList>[] = []
    let testUsers = await UserModel.generateTestData(10)
    for (let i = 1; i < testDocumentsCount + 1; i++) {
      let score1 = getRandom(0, 16)
      let score2 = 0
      if (score1 != 16) {
        score2 = 30 - score1
      }
      let document = new this({
        id: await this.getRandomID(),
        game: 'StandOff2',
        score: {
          mapName: 'testMap',
          command1: score1,
          command2: score2,
        },
      })

      for (let usersCount = 0; usersCount < 10; ) {
        for (let i = 0; i < 5; ) {
          let usedUsers: string[] = []
          let user = testUsers[getRandom(0, testUsers.length - 1)]
          if (usedUsers.includes(user.profile.username)) continue
          if (usersCount < 5) {
            document.members.push({
              name: user.profile.username,
              command: 'command1',
              statistic: { kills: 0, deaths: 0, assists: 0 },
            })
            usedUsers.push(user.profile.username)
            i++
          } else {
            document.members.push({
              name: user.profile.username,
              command: 'command2',
              statistic: { kills: 0, deaths: 0, assists: 0 },
            })
            usedUsers.push(user.profile.username)
            i++
          }
        }
        usersCount += 5
      }

      await document.save()
      generatedDocuments.push(document)
    }

    return generatedDocuments
  }

  public static async getTestData(this: ReturnModelType<typeof MatchList>) {
    return this.find({
      'score.mapName': 'testMap',
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof MatchList>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
  }

  private static async getRandomID() {
    let id = v4()
    while (await MatchListModel.findOne({ id })) id = v4()
    return id
  }
}
