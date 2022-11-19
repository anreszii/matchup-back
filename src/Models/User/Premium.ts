import { getModelForClass, prop, ReturnModelType } from '@typegoose/typegoose'
import { TechnicalCause, TechnicalError } from '../../error'

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
    unique: true,
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

  static async createPeriod(
    this: ReturnModelType<typeof PremiumPeriods>,
    period: number,
    price: number,
  ) {
    if (await this.findByPeriod(period))
      throw new TechnicalError('period', TechnicalCause.ALREADY_EXIST)
    await this.create({ price, period })
  }
}

export const PERIODS = getModelForClass(PremiumPeriods)
