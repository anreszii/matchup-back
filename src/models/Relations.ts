import { Schema, Types } from 'mongoose'

export declare interface IRelations {
  friends: Types.Array<string>
  subscribers: Types.Array<string>
}

export const Relations = new Schema<IRelations>({
  friends: [String],
  subscribers: [String],
})
