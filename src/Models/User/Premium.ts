import { getModelForClass, prop, ReturnModelType } from '@typegoose/typegoose'

export class Premium {
  @prop({ required: true, default: false })
  isPremium!: boolean
  @prop({ type: () => Date })
  expiresIn?: Date
}

class PremiumPeriods {
  @prop({
    required: true,
    validate: {
      validator: function (v: number) {
        return v > 0
      },
    },
  })
  price!: number
  @prop({
    required: true,
    validate: {
      validator: function (v: number) {
        return v > 0
      },
    },
  })
  periodInDays!: number

  static async findByPeriod(
    this: ReturnModelType<typeof PremiumPeriods>,
    period: number,
  ) {
    return this.findOne({ periodInDays: period })
  }
}

export const PERIODS = getModelForClass(PremiumPeriods)
