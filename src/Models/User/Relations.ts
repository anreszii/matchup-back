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
  constructor(public name: string, public image?: string | null) {}
  async load() {
    let image = await ImageModel.findById(this.image)
    this.image = image ? image.display_url : null
  }
}
