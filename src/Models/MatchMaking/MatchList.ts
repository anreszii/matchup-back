import {
  prop,
  getModelForClass,
  Ref,
  ReturnModelType,
  ArraySubDocumentType,
} from '@typegoose/typegoose'
import { Types } from 'mongoose'
import { Member } from './Member.js'
import type { Match } from '../../Interfaces/index.js'
/**
 * @TODO
 * Add match score
 */
class MatchList {
  @prop({ required: true, unique: true })
  public id!: string
  @prop({ required: true })
  public game!: Match.Manager.supportedGames
  @prop({ type: () => Member, default: [] })
  public members!: ArraySubDocumentType<Member>[]

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
