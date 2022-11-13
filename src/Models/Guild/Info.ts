import { prop } from '@typegoose/typegoose'
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
}

export class Terms {
  @prop({ required: true, default: false })
  private!: boolean
  @prop({ required: true })
  minimalGRI?: number
  @prop({ required: true })
  invitationOnly?: boolean
}

type Name = string
export class PrivateInfo {
  @prop({ required: true, default: 'none' })
  chat!: string
  @prop({ required: true, default: [], type: () => String, _id: false })
  invites!: Map<Name, GuildMemberData>
  @prop({ required: true, default: new Map(), type: () => String, _id: false })
  requests!: Map<Name, GuildMemberData>
}
