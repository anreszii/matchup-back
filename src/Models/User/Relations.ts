import { prop } from '@typegoose/typegoose'
import { TechnicalCause, TechnicalError } from '../../error'
import { Image } from '../Image'
import { UserModel } from '../index'

export class Relations {
  @prop({ type: () => String, required: true, default: [] })
  public friends!: string[]
  @prop({ type: () => String, required: true, default: [] })
  public subscribers!: string[]
}

export class RelationRecord {
  public image?: Image
  constructor(public name: string) {
    UserModel.findByName(name).then((user) => {
      if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
      this.image = user.profile.avatar
    })
  }
}
