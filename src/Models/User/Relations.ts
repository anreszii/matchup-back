import { prop, Ref } from '@typegoose/typegoose'
import { Loadable } from '../../Interfaces/index'
import { Image, ImageModel } from '../Image'
import { User } from './User'

export class Relations {
  @prop({ ref: () => User, required: true, default: [] })
  public friends!: Ref<User>[]
  @prop({ ref: () => User, required: true, default: [] })
  public subscribers!: Ref<User>[]
}

export class RelationRecord implements Loadable {
  constructor(public name: string, public image?: string | null) {}
  async load() {
    let image = await ImageModel.findById(this.image)
    this.image = image ? image.display_url : null
  }
}
