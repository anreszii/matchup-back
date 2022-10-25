import { getModelForClass, prop } from '@typegoose/typegoose'

type owner = 'user' | 'guild'

export class RatingRecord {
  @prop({ required: true })
  owner!: string
  @prop({
    required: true,
    default: 0,
    validate: {
      validator: (prop: number) => prop >= 0,
      message: 'mpr must be greater than 0',
    },
  })
  mpr!: number
}

export const RecordModel = getModelForClass(RatingRecord)
