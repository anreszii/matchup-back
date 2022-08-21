import { Types } from 'mongoose'
import { prop } from '@typegoose/typegoose'

export class Relations {
  @prop({ type: String, required: true, default: [] })
  public friends!: Types.Array<string>
  @prop({ type: String, required: true, default: [] })
  public subscribers!: Types.Array<string>
}
