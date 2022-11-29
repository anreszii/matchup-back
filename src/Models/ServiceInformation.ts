import { prop } from '@typegoose/typegoose'

export class ServiceInformation {
  @prop({ required: true, unique: true })
  id!: string
  @prop({ required: true, default: new Date() })
  createdAt!: Date
}
