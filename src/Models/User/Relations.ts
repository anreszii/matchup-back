import { prop } from '@typegoose/typegoose'
import { Loadable } from '../../Interfaces/index'
import { Image, ImageModel } from '../Image'

export class Relations {
  @prop({ type: () => String, required: true, default: [] })
  public friends!: string[]
  @prop({ type: () => String, required: true, default: [] })
  public subscribers!: string[]
}

export class RelationRecord implements Loadable {
  public avatar: Image | null = null
  constructor(public name: string, public imageID: string | undefined) {}
  async load() {
    this.avatar = await ImageModel.findById(this.imageID)
  }
}
