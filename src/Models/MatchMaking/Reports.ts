import {
  prop,
  getModelForClass,
  ReturnModelType,
  DocumentType,
} from '@typegoose/typegoose'
import type { Match } from '../../Interfaces'
import { validationCause, ValidationError } from '../../error'

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

  public async log(
    this: DocumentType<ReportList>,
    game: Match.Manager.supportedGames,
    reason: string,
    describe: string,
    proof?: string,
  ) {
    this.id = Date.now()
    this.game = game
    this.reason = reason
    this.describe = describe
    this.proof = proof
    return this
  }

  public static async addProof(
    this: ReturnModelType<typeof ReportList>,
    id: number,
    proof: string,
    rewrite: boolean = false,
  ) {
    let report = await this.findOne({ id })
    if (!report) throw new ValidationError('reportID', validationCause.INVALID)

    if (report.proof && !rewrite)
      throw new ValidationError('report proof', validationCause.ALREADY_EXIST)

    report.proof = proof
    return report.save()
  }
}
