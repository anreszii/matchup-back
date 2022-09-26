import { prop } from '@typegoose/typegoose'

export declare type expType = 'hour' | 'day' | 'week' | 'year'
export declare type expirationTime = {
  amount: number
  format: expType
}

export class ExpirationTime {
  @prop({ required: true })
  expirationType!: expType
  @prop({ required: true })
  public expirationDate!: Date
}
