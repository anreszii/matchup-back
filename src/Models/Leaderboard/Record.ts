import { prop } from '@typegoose/typegoose'

export class RatingRecord {
  @prop({ required: true })
  name!: string
  @prop({
    required: true,
    default: 0,
    validate: {
      validator: (prop: number) => prop >= 0,
      message: 'mpr must be greater than 0',
    },
  })
  ratingPoints!: number
  @prop({
    required: true,
    default:
      'https://i.ibb.co/hFgzCH1/Sun-Dec-04-2022-7-EBD0-D60-D3-C4-45-C4-B451-244736-A02898-png.png',
  })
  image!: string
}
