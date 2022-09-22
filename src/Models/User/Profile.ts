import { prop, SubDocumentType } from '@typegoose/typegoose'
import { Relations } from '../Relations.js'

export class Profile {
  @prop({
    required: [true, 'nickname required'],
    unique: true,
    validate: {
      validator: function (v: string) {
        let length = v.length
        return length >= 6 && length <= 18
      },
      message: () => `invalid nickname format`,
    },
  })
  nickname!: string
  @prop({
    required: [true, 'username required'],
    unique: true,
    validate: {
      validator: function (v: string) {
        let length = v.length
        return length >= 6 && length <= 18
      },
      message: () => `invalid username format`,
    },
  })
  username!: string
  @prop({ required: true, default: 0 })
  balance!: number
  @prop()
  avatar?: string
  @prop({ required: true, default: new Relations() })
  relations!: Relations
  @prop()
  tag?: string
}
