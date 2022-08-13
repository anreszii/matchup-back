import { model, Schema, Types, Model, HydratedDocument } from 'mongoose'
import { SUPPORTED_GAMES } from '..'
import type { Member } from '../MatchMaking'

export declare interface IMatchList {
  id: string
  game: SUPPORTED_GAMES
  members: Types.Array<Member>
}

export const MemberSchema = new Schema<Member>({
  name: { type: String, required: true },
  command: { type: String, required: true },
  statistic: { type: Array, required: true },
})

export declare interface MatchListBehavior {}

export interface MatchListModel extends Model<IMatchList, {}, IMatchList> {
  getByID(id: string): Promise<HydratedDocument<MatchListModel>>
  getAll(): Promise<Array<HydratedDocument<MatchListModel>>>
}

export const MatchListSchema = new Schema<
  IMatchList,
  MatchListModel,
  MatchListBehavior
>({
  id: { type: String, required: true, unique: true },
  game: { type: String, required: true },
  members: { type: Array(), required: true },
})

MatchListSchema.statics.getByID = function (id: string) {
  return this.findOne({ id })
}

MatchListSchema.statics.getAll = function () {
  return this.find({})
}

export const User = model<IMatchList, MatchListModel>(
  'MatchList',
  MatchListSchema,
)
