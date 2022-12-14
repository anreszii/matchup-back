import {
  getModelForClass,
  prop,
  Ref,
  ReturnModelType,
} from '@typegoose/typegoose'
import { Types } from 'mongoose'
import { TechnicalCause, TechnicalError } from '../../error'
import { MatchListModel, Match } from '../index'
import { ServiceInformation } from '../ServiceInformation'
import { StandOff_Lobbies } from '../../API/Sockets'
import { MINUTE_IN_MS } from '../../configs/time_constants'

class MatchModerationRecord {
  @prop({ required: true, type: () => ServiceInformation, _id: false })
  info!: ServiceInformation
  @prop({ required: true, ref: () => Match })
  match!: Ref<Match>
  @prop({ required: true, default: false })
  moderated!: boolean

  static async createTask(
    this: ReturnModelType<typeof MatchModerationRecord>,
    match: Types.ObjectId,
  ) {
    const matchDocument = await MatchListModel.findById(match)
    if (!matchDocument)
      throw new TechnicalError('match id', TechnicalCause.INVALID)

    const record = new this()
    record.match = matchDocument._id
    record.info = new ServiceInformation()
    await record.save()

    return true
  }
}

export const MatchModerationRecordModel = getModelForClass(
  MatchModerationRecord,
)

setInterval(function () {
  MatchModerationRecordModel.find({})
    .then((records) => {
      for (let record of records) {
        if (!record.moderated) continue
        MatchListModel.findById(record.match)
          .then(async (match) => {
            if (!match) {
              await record.delete()
              throw new TechnicalError('match', TechnicalCause.NOT_EXIST)
            }
            await match
              .calculateResults()
              .then(() => {
                record
                  .delete()
                  .then()
                  .catch((e) => {
                    console.error(e)
                  })
              })
              .catch((e) => {
                console.error(e)
                record.moderated = false
              })
            let lobby = StandOff_Lobbies.get(match.info.lobby)
            if (!lobby) return
            await lobby.markToDelete()
          })
          .catch((e) => console.log(e))
      }
    })
    .catch((e) => console.error(e))
}, MINUTE_IN_MS * 30)
