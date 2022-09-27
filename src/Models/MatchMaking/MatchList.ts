import {
  prop,
  getModelForClass,
  ReturnModelType,
  DocumentType,
  Ref,
} from '@typegoose/typegoose'
import { Types } from 'mongoose'
import { Member } from './Member'
import type { Match } from '../../Interfaces'
import { Image, ImageModel } from '../Image'
/**
 * @TODO
 * Add match score
 */
class MatchList {
  @prop({ required: true, unique: true })
  public id!: string
  @prop({ required: true })
  public game!: Match.Manager.supportedGames
  @prop({ default: [] })
  public members!: Types.Array<Member>
  @prop({ ref: () => Image })
  public screen?: Ref<Image>

  public static async findByID(
    this: ReturnModelType<typeof MatchList>,
    id: string,
  ) {
    return this.findOne({ id })
  }

  public static async getAll(this: ReturnModelType<typeof MatchList>) {
    return this.find()
  }

  public async setScreen(
    this: DocumentType<MatchList>,
    image: Buffer,
    contentType: string,
  ) {
    this.screen = await ImageModel.create({
      buffer: image,
      contentType,
    })
  }
}

export const MatchListModel = getModelForClass(MatchList)
