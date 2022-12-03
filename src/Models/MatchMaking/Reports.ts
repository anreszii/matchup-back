import { prop, ReturnModelType, DocumentType } from '@typegoose/typegoose'
import type { Match } from '../../Interfaces/index'
import { v4 } from 'uuid'
import { TechnicalCause, TechnicalError } from '../../error'
import { ServiceInformation } from '../ServiceInformation'

export class Report {
  @prop({
    required: true,
    unique: true,
    type: () => ServiceInformation,
    _id: false,
  })
  public info!: ServiceInformation
  @prop({ required: true })
  public game!: Match.Manager.supportedGames
  @prop({ required: true })
  public reason!: string
  @prop({ required: true })
  public describe!: string
  @prop()
  public proof?: string

  public static async log(
    this: ReturnModelType<typeof Report>,
    game: Match.Manager.supportedGames,
    reason: string,
    describe: string,
    proof?: string,
  ) {
    return this.create({
      game,
      reason,
      describe,
      proof,
      info: new ServiceInformation(),
    })
  }

  public static async addProof(
    this: ReturnModelType<typeof Report>,
    id: number,
    proof: string,
    rewrite: boolean = false,
  ) {
    let report = await this.findOne({ 'info.id': id })
    if (!report) throw new TechnicalError('reportID', TechnicalCause.INVALID)

    if (report.proof && !rewrite)
      throw new TechnicalError('report proof', TechnicalCause.ALREADY_EXIST)

    report.proof = proof
    return report.save()
  }

  public static async generateTestData(
    this: ReturnModelType<typeof Report>,
    testDocumentsCount = 4,
  ) {
    let generatedDocuments: DocumentType<Report>[] = []
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

  public static async getTestData(this: ReturnModelType<typeof Report>) {
    return this.find({
      game: { $regex: 'test_game' },
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof Report>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
    return true
  }
}
