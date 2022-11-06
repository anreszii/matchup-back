import type { Ref, DocumentType } from '@typegoose/typegoose/lib/types'
import type { Types } from 'mongoose'
import { prop, ReturnModelType } from '@typegoose/typegoose'
import { v4 as uuid } from 'uuid'
import { UserModel } from '../index'
import { getRandom } from '../../Utils/math'
import { TechnicalCause, TechnicalError } from '../../error'
import { User } from '../User/User'

export class OrderList {
  @prop({ required: true, unique: true })
  public id!: string
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
    this: ReturnModelType<typeof OrderList>,
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

    let newOrder = new this({
      id: await this._getUniqueID(),
      owner: user,
      country,
      region,
      city,
      street,
      houseNumber,
      postalCode,
    })

    await newOrder.validate()
    await newOrder.save()
  }

  public static async generateTestData(
    this: ReturnModelType<typeof OrderList>,
    testDocumentsCount: number = 4,
  ) {
    let testUsers = await UserModel.generateTestData(5)
    for (let i = 0; i < testDocumentsCount; i++) {
      await this.createOrder(
        testUsers[getRandom(0, testUsers.length - 1)],
        'testCountry',
        'testRegion',
        'testCity',
        'testStreet',
        `${getRandom(1, 999)}`,
        createRandomPostal(),
      )
    }
  }

  public static async getTestData(this: ReturnModelType<typeof OrderList>) {
    return this.find({
      country: { $regex: 'test' },
      region: { $regex: 'test' },
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof OrderList>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
  }

  private static async _getUniqueID(this: ReturnModelType<typeof OrderList>) {
    let id = uuid()
    while (await this.findOne({ id })) id = uuid()

    return id
  }
}

function createRandomPostal() {
  return `${getRandom(1, 9)}${getRandom(0, 9)}${getRandom(0, 9)}${getRandom(
    0,
    9,
  )}-${getRandom(1, 9)}${getRandom(0, 9)}${getRandom(0, 9)}${getRandom(0, 9)}`
}
