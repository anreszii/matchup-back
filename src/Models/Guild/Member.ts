import { prop, Ref } from '@typegoose/typegoose'
import { User } from '../User/User'

export class GuildMemberData {
  @prop({ required: true, ref: () => User })
  id!: Ref<User>
  @prop({ required: true })
  name!: string
  @prop({ required: true })
  mpr!: number
  @prop()
  role?: string
}
