import { prop } from '@typegoose/typegoose'
import { IChat } from '../../Interfaces/index'

export class Author implements IChat.Author {
  @prop({ required: true })
  name!: string
  @prop({ type: () => String })
  avatar?: string | undefined
  @prop({ type: () => String })
  prefix?: string | undefined
}
