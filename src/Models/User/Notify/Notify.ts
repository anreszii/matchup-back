import { getModelForClass, prop } from '@typegoose/typegoose'
import { v4 as uuid } from 'uuid'
import { ServiceInformation } from '../../ServiceInformation'

class NotifyServiceInformation extends ServiceInformation {
  @prop({ required: true, default: false })
  readed!: boolean
}

export class Notify {
  constructor(content: string) {
    this.content = content
  }

  @prop({
    required: true,
    type: () => NotifyServiceInformation,
    default: new NotifyServiceInformation(),
    _id: false,
  })
  info!: NotifyServiceInformation
  @prop({ required: true })
  content!: string
}
