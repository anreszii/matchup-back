import { prop } from '@typegoose/typegoose'

export class Progress {
  @prop({ required: true })
  public currentPoints!: number
  @prop({ required: true })
  public requiredPoints!: number
}
