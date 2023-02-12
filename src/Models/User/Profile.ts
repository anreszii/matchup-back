import { prop, Ref } from '@typegoose/typegoose'
import { Image } from '../Image.js'
import { Relations } from './Relations.js'

export class Profile {
  @prop()
  nickname!: string
  @prop({
    required: [true, 'username required'],
    unique: true,
    validate: {
      validator: function (v: string) {
        if (v.startsWith('test_')) return true
        let length = v.length
        return length >= 3 && length <= 18
      },
      message: () => `invalid username format`,
    },
  })
  username!: string
  @prop()
  discord_nickname?: string
  @prop({ required: true, default: 0 })
  balance!: number
  @prop({
    default:
      'https://s3.timeweb.com/20dedb32-20f03057-47ef-48f3-993e-e68518aa77ec/defaultavi.png',
  })
  avatar?: string
  @prop({ required: true, default: new Relations(), _id: false })
  relations!: Relations
  @prop()
  tag?: string
}
