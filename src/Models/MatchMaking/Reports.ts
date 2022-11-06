import { prop, ReturnModelType, DocumentType } from '@typegoose/typegoose'
import type { Match } from '../../Interfaces'
import { v4 } from 'uuid'
import { ReportListModel } from '../index'
import { TechnicalCause, TechnicalError } from '../../error'

export class ReportList {
  @prop({ required: true, unique: true })
  public id!: number
  @prop({ required: true })
  public game!: Match.Manager.supportedGames
  @prop({ required: true })
  public reason!: string
  @prop({ required: true })
  public describe!: string
  @prop()
  public proof?: string

  public static async log(
    this: ReturnModelType<typeof ReportList>,
    game: Match.Manager.supportedGames,
    reason: string,
    describe: string,
    proof?: string,
  ) {
    let document = new this({
      id: await this.getUniqueID(),
      game,
      reason,
      describe,
      proof,
    })
    return document.save()
  }

  public static async addProof(
    this: ReturnModelType<typeof ReportList>,
    id: number,
    proof: string,
    rewrite: boolean = false,
  ) {
    let report = await this.findOne({ id })
    if (!report) throw new TechnicalError('reportID', TechnicalCause.INVALID)

    if (report.proof && !rewrite)
      throw new TechnicalError('report proof', TechnicalCause.ALREADY_EXIST)

    report.proof = proof
    return report.save()
  }

  public static async generateTestData(
    this: ReturnModelType<typeof ReportList>,
    testDocumentsCount = 4,
  ) {
    let generatedDocuments: DocumentType<ReportList>[] = []
    for (let i = 1; i < testDocumentsCount + 1; i++) {
      let report = await this.log(
        'test_game' as unknown as Match.Manager.supportedGames,
        `reason#${v4()}`,
        `describe#${v4()}`,
      )
      report.save()
      generatedDocuments.push(report)
    }

    return generatedDocuments
  }

  public static async getTestData(this: ReturnModelType<typeof ReportList>) {
    return this.find({
      game: { $regex: 'test_game' },
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof ReportList>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
  }

  private static async getUniqueID() {
    let id = Date.now()
    while (await ReportListModel.findOne({ id })) id = Date.now()

    return id
  }
}
