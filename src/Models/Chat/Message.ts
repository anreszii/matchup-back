import { prop } from '@typegoose/typegoose'
import { v4 as uuid } from 'uuid'

class ServiceInformation {
  @prop({ required: true, unique: true, default: uuid() })
  id!: string
  @prop({ required: true, default: new Date() })
  createdAt!: Date
}

export class Message {
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
