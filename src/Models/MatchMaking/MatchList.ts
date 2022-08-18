import {
  prop,
  getModelForClass,
  Ref,
  ReturnModelType,
} from '@typegoose/typegoose'
import { Types } from 'mongoose'
import { SUPPORTED_GAMES } from '../../Interfaces'
import { Member } from './Member'

/**
 * @TODO
 * Add match score
 */
class MatchList {
  @prop({ required: true, unique: true })
  public id!: string
  @prop({ required: true })
  public game!: SUPPORTED_GAMES
  @prop({ required: true, ref: Member })
  public members!: Types.ArraySubdocument<Ref<Member>>

  public static async findByID(
    this: ReturnModelType<typeof MatchList>,
    id: string,
  ) {
    return this.findOne({ id })
  }

  public static async getAll(this: ReturnModelType<typeof MatchList>) {
    return this.find()
  }
}

export const MatchListModel = getModelForClass(MatchList)
