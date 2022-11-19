import { prop } from '@typegoose/typegoose'
import { v4 as uuid } from 'uuid'
import { IChat } from '../../Interfaces/index'
import { Author } from './Author'

class ServiceInformation {
  @prop({ required: true })
  id!: string
  @prop({ required: true })
  createdAt!: Date
}

export class Message implements IChat.Message {
  constructor(message: IChat.Message) {
    this.info = {
      id: uuid(),
      createdAt: new Date(),
    }
    this.author = message.author
    this.content = message.content
  }
  @prop({
    required: true,
    type: () => ServiceInformation,
    default: new ServiceInformation(),
    _id: false,
  })
  info!: ServiceInformation
  @prop({ required: true, _id: false, type: () => Author })
  author!: Author
  @prop({ required: true, default: '' })
  content!: string
}
