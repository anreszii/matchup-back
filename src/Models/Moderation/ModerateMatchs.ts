import {
  getModelForClass,
  prop,
  Ref,
  ReturnModelType,
} from '@typegoose/typegoose'
import { Types } from 'mongoose'
import { TechnicalCause, TechnicalError } from '../../error'
import { MatchListModel } from '../index'
import { Match } from '../MatchMaking/Matchs'
import { ServiceInformation } from '../ServiceInformation'

class MatchModerationRecord {
  constructor() {
    this.info = new ServiceInformation()
  }
  @prop({ required: true, type: () => ServiceInformation, _id: false })
  info!: ServiceInformation
  @prop({ required: true, ref: () => Match })
  match!: Ref<Match>
  @prop({ required: true, default: false })
  moderated!: boolean

  static async createTask(
    this: ReturnModelType<typeof MatchModerationRecord>,
    match: string | Types.ObjectId,
  ) {
    if (!Types.ObjectId.isValid(match))
      throw new TechnicalError('match id', TechnicalCause.INVALID_FORMAT)
    const matchDocument = await MatchListModel.findById(match)
    if (!matchDocument)
      throw new TechnicalError('match id', TechnicalCause.INVALID)

    const record = new this()
    record.match = matchDocument._id
    await record.save()

    return true
  }
}

export const MatchModerationRecordModel = getModelForClass(
  MatchModerationRecord,
)
