import { prop } from '@typegoose/typegoose'

export class Reward {
  @prop({ required: true })
  public amount!: number
  @prop({ required: true })
  public type!: 'exp' | 'mp'
}
