import { prop } from '@typegoose/typegoose'

export class Level {
  @prop({ required: true, default: 0 })
  currentBPLevel!: number
  @prop({ required: true, default: 0 })
  currentRequirerEXP!: number
  @prop({ required: true, default: 0 })
  currentEXP!: number
}
