import { prop } from '@typegoose/typegoose'

export class Flags {
  @prop({ required: true, default: false })
  public complete!: boolean
  @prop({ required: true, default: false })
  public static!: boolean
}
