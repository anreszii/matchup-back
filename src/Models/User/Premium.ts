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
  periodInMonths!: number

  static findByPeriod(
    this: ReturnModelType<typeof PremiumPeriods>,
    period: number,
  ) {
    return this.findOne({ periodInMonths: period })
  }

  static createPeriod(
    this: ReturnModelType<typeof PremiumPeriods>,
    period: number,
    price: number,
  ) {
    return this.findByPeriod(period)
      .then((document) => {
        if (document)
          throw new TechnicalError('period', TechnicalCause.ALREADY_EXIST)

        return this.create({ price, periodInMonths: period })
          .then(() => true)
          .catch((e) => {
            console.error(e)
          })
      })
      .catch((e) => {
        throw e
      })
  }

  static changePrice(
    this: ReturnModelType<typeof PremiumPeriods>,
    period: number,
    price: number,
  ) {
    return this.findByPeriod(period).then(async (document) => {
      if (!document)
        throw new TechnicalError('period', TechnicalCause.NOT_EXIST)
      document.price = price
      await document.save()

      return true
    })
  }

  static deletePeriod(
    this: ReturnModelType<typeof PremiumPeriods>,
    period: number,
  ) {
    return this.findByPeriod(period).then((period) => {
      if (!period)
        throw new TechnicalError('period', TechnicalCause.ALREADY_EXIST)
      return period.delete()
    })
  }
}

export const PERIODS = getModelForClass(PremiumPeriods)
