import { prop } from '@typegoose/typegoose'

export class Statistic {
  @prop({ required: true, default: 0 })
  kills!: number
  @prop({ required: true, default: 0 })
  deaths!: number
  @prop({ required: true, default: 0 })
  assists!: number
}
