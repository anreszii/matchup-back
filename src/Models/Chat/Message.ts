import { prop } from '@typegoose/typegoose'
import { v4 as uuid } from 'uuid'
import { IChat } from '../../Interfaces/index'

class ServiceInformation {
  @prop({ required: true })
  id!: string
  @prop({ required: true })
  createdAt!: Date
}

export class Message implements IChat.Message {
  constructor(author: string, content: string) {
    this.info = {
      id: uuid(),
      createdAt: new Date(),
    }
    this.author = author
    this.content = content
  }
  @prop({
    required: true,
    type: () => ServiceInformation,
    default: new ServiceInformation(),
    _id: false,
  })
  info!: ServiceInformation
  @prop({ required: true })
  author!: string
  @prop({ required: true, default: '' })
  content!: string
}
