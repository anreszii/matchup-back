import type { Ref, DocumentType } from '@typegoose/typegoose/lib/types'
import type { Types } from 'mongoose'
import { prop, ReturnModelType } from '@typegoose/typegoose'
import { UserModel } from '../index'
import { getRandom } from '../../Utils/math'
import { TechnicalCause, TechnicalError } from '../../error'
import { User } from '../User/User'
import { ServiceInformation } from '../ServiceInformation'

export class Order {
  @prop({
    required: true,
    type: () => ServiceInformation,
  })
  public info!: ServiceInformation
  @prop({ required: true, ref: () => User })
  public owner!: Ref<User>
  @prop({ required: true })
  public country!: string
  @prop({ required: true })
  public region!: string
  @prop({ required: true })
  public city!: string
  @prop({ required: true })
  public street!: string
  @prop({ required: true })
  public houseNumber!: string
  @prop({ required: true })
  public postalCode!: string

  public static async createOrder(
    this: ReturnModelType<typeof Order>,
    owner: Types.ObjectId | DocumentType<User> | string,
    country: string,
    region: string,
    city: string,
    street: string,
    houseNumber: string,
    postalCode: string,
  ) {
    let user: DocumentType<User> | undefined | null
    switch (typeof owner) {
      case 'string':
        user = await UserModel.findByName(owner)
        if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
        break

      case 'object':
        user = await UserModel.findById(owner._id)
        if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
        break

      default:
        throw new TechnicalError('user', TechnicalCause.INVALID_FORMAT)
    }

    return this.create({
      owner: user,
      country,
      region,
      city,
      street,
      houseNumber,
      postalCode,
      info: new ServiceInformation(),
    })
  }

  public static async generateTestData(
    this: ReturnModelType<typeof Order>,
    testDocumentsCount: number = 4,
  ) {
    let testUsers = await UserModel.generateTestData(5, false)
    let records = []
    for (let i = 0; i < testDocumentsCount; i++)
      records.push(
        await this.createOrder(
          testUsers[getRandom(0, testUsers.length - 1)],
          'testCountry',
          'testRegion',
          'testCity',
          'testStreet',
          `${getRandom(1, 999)}`,
          createRandomPostal(),
        ),
      )

    return records
  }

  public static async getTestData(this: ReturnModelType<typeof Order>) {
    return this.find({
      country: { $regex: 'test' },
      region: { $regex: 'test' },
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof Order>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
    return true
  }
}

function createRandomPostal() {
  return `${getRandom(1, 9)}${getRandom(0, 9)}${getRandom(0, 9)}${getRandom(
    0,
    9,
  )}-${getRandom(1, 9)}${getRandom(0, 9)}${getRandom(0, 9)}${getRandom(0, 9)}`
}
