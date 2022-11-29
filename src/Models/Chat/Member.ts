import { prop, Ref } from '@typegoose/typegoose'
import { User } from '../User/User'

export class ChatMember {
  @prop({ ref: () => User })
  id?: Ref<User>
  @prop({ required: true })
  name!: string
  @prop()
  avatar?: string
  @prop()
  prefix?: string
}
