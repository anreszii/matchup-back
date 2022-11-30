import { prop } from '@typegoose/typegoose'
import { v4 as uuid } from 'uuid'

export class ServiceInformation {
  @prop({ required: true, unique: true, default: uuid() })
  id!: string
  @prop({ required: true, default: new Date() })
  createdAt!: Date
}
