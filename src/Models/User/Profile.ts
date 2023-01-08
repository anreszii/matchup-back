import { prop, Ref } from '@typegoose/typegoose'
import { Image } from '../Image.js'
import { Relations } from './Relations.js'

export class Profile {
  @prop({
    validate: {
      validator: function (v: string) {
        if (typeof v != 'string') return false
        if (v.startsWith('test_') || v == '') return true
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
  @prop()
  discord_nickname?: string
  @prop({ required: true, default: 0 })
  balance!: number
  @prop({
    default:
      'https://i.ibb.co/znw3YQ5/Sun-Jan-08-2023-954-D9-F45-309-A-4477-88-A8-7-B3546-D2341-E-png.png',
  })
  avatar?: string
  @prop({ required: true, default: new Relations(), _id: false })
  relations!: Relations
  @prop()
  tag?: string
}
