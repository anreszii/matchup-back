import { prop, Ref } from '@typegoose/typegoose'
import { User } from 'discord.js'

export class Member {
  @prop({ required: true, ref: () => User })
  id: Ref<User>
  @prop({ required: true })
  name!: string
}
