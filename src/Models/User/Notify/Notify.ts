import { prop } from '@typegoose/typegoose'
import { ServiceInformation } from '../../ServiceInformation'

class NotifyServiceInformation extends ServiceInformation {
  constructor() {
    super()
    this.readed = false
  }
  @prop({ required: true })
  readed!: boolean
}

export class Notify {
  constructor(content: string) {
    this.info = new NotifyServiceInformation()
    this.content = content
  }

  @prop({
    required: true,
    type: () => NotifyServiceInformation,
    _id: false,
  })
  info!: NotifyServiceInformation
  @prop({ required: true })
  content!: string
}
