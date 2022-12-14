import { prop } from '@typegoose/typegoose'
import { IChat } from '../../Interfaces/index'
import { ServiceInformation } from '../ServiceInformation'
import { Author } from './Author'

export class Message implements IChat.Message {
  constructor(message: IChat.Message) {
    this.info = new ServiceInformation()
    this.author = message.author
    this.content = message.content
  }
  @prop({
    required: true,
    type: () => ServiceInformation,
    _id: false,
  })
  info!: ServiceInformation
  @prop({ required: true, _id: false, type: () => Author })
  author!: Author
  @prop({ required: true, default: '' })
  content!: string
}
