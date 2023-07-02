import { prop, Ref } from '@typegoose/typegoose'
import { GuildMemberData } from './Member'

export class PublicInfo {
  @prop({ required: true, unique: true })
  name!: string
  @prop({
    required: true,
    unique: true,
    validate: { validator: (val: string) => val.length > 0 && val.length < 5 },
  })
  tag!: string
  @prop({ required: true, default: 0 })
  GRI!: number
  @prop({ required: true, default: 'Добро пожаловать!' })
  description!: string
  @prop({})
  profileImage?: string
}

export class Terms {
  @prop({ required: true, default: false })
  private!: boolean
  @prop()
  minimalGRI?: number
  @prop()
  invitationOnly?: boolean
}

export class PrivateInfo {
  @prop({ required: true, default: 'none' })
  chat!: string
  @prop({
    required: true,
    default: [],
    type: () => GuildMemberData,
    _id: false,
  })
  invites!: GuildMemberData[]
  @prop({
    required: true,
    default: new Array(),
    type: () => GuildMemberData,
    _id: false,
  })
  requests!: GuildMemberData[]
  @prop({ required: true, default: [], _id: false, type: () => String })
  blackList!: string[]
}
