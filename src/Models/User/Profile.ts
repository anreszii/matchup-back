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
  @prop({ required: true, default: 0 })
  balance!: number
  @prop({
    default:
      'https://i.ibb.co/7tSmbVN/Sun-Dec-04-2022-7-EBD0-D60-D3-C4-45-C4-B451-244736-A02898-png.png',
  })
  avatar?: string
  @prop({ required: true, default: new Relations(), _id: false })
  relations!: Relations
  @prop()
  tag?: string
}
