import { prop } from '@typegoose/typegoose'
import { Image } from '../Image.js'
import { Relations } from './Relations.js'

export class Profile {
  @prop({
    required: [true, 'nickname required'],
    unique: true,
    validate: {
      validator: function (v: string) {
        if (v.startsWith('test_')) return true
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
        if (v.startsWith('test_')) return true
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
  avatar?: Image
  @prop({ required: true, default: new Relations(), _id: false })
  relations!: Relations
  @prop()
  tag?: string
}
