import { getModelForClass, prop } from '@typegoose/typegoose'

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
  ratingPoints!: number
}
