import { prop } from '@typegoose/typegoose'
import { v4 as uuid } from 'uuid'

export class ServiceInformation {
  constructor() {
    this.id = uuid()
    this.createdAt = new Date()
  }
  @prop({ required: true, unique: true })
  id!: string
  @prop({ required: true })
  createdAt!: Date
}
