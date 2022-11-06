import { prop } from '@typegoose/typegoose'
import { Image } from '../Image'

export class Relations {
  @prop({ type: () => RelationRecord, required: true, default: [] })
  public friends!: RelationRecord[]
  @prop({ type: () => RelationRecord, required: true, default: [] })
  public subscribers!: RelationRecord[]
}

class RelationRecord {
  @prop({ required: true })
  name!: string
  @prop({ type: () => Image, _id: false })
  avatar?: Image
}
