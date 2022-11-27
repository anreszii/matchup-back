import type { USER_ROLE } from '../../Interfaces'

import {
  prop,
  ReturnModelType,
  DocumentType,
  Ref,
  getModelForClass,
} from '@typegoose/typegoose'

import { Profile } from './Profile'
import { Credentials } from './Credentials'
import { Rating } from '../MatchMaking/Rating'

import { TaskListModel, UserModel } from '../'
import { Guild } from '../Guild/Guild'

import { generatePassword } from '../../Utils/passwordGenerator'
import { generateName } from '../../Utils/nameGenerator'
import { TechnicalCause, TechnicalError } from '../../error'
import { RelationRecord } from './Relations'
import { generateHash } from '../../Utils/hashGenerator'
import { getRandom } from '../../Utils/math'
import { ImageModel } from '../Image'
import { PERIODS, Premium } from './Premium'

class Prefixes {
  @prop({ required: true })
  name!: string
}

const PREFIXES = getModelForClass(Prefixes)

export class User {
  @prop({
    required: [true, 'id required'],
    unique: true,
    validate: {
      validator: function (v: number) {
        return v == v && v % 1 === 0
      },
      message: (props) => `invalid id format`,
    },
  })
  id!: number
  @prop({ required: true, _id: false })
  credentials!: Credentials
  @prop({ required: true, _id: false })
  profile!: Profile
  @prop({
    required: true,
    type: () => Rating,
    default: new Rating(),
    _id: false,
  })
  rating!: Rating
  @prop({
    required: true,
    type: () => Premium,
    default: new Premium(),
    _id: false,
  })
  premium!: Premium
  @prop({ required: true, default: 'default' })
  role!: USER_ROLE
  @prop()
  prefix?: string
  @prop({ ref: () => Guild })
  guild?: Ref<Guild>

  static async findByName(
    this: ReturnModelType<typeof User>,
    name: string,
  ): Promise<DocumentType<User>> {
    return this.findOne({
      'profile.username': name,
    }).exec() as unknown as DocumentType<User>
  }

  static async findByEmail(this: ReturnModelType<typeof User>, email: string) {
    return this.findOne({
      'credentials.email': email,
    }).exec() as unknown as DocumentType<User>
  }

  static async getPublicData(this: ReturnModelType<typeof User>, name: string) {
    return this.findOne(
      { 'profile.username': name },
      'id profile level rating role prefix guild credentials.email credentials.region',
    )
  }

  static async addPrefix(prefix: string) {
    if (await PREFIXES.findOne({ name: prefix }))
      throw new TechnicalError('prefix', TechnicalCause.ALREADY_EXIST)
    await PREFIXES.create({ name: prefix })
    return true
  }

  static async getPrefixes() {
    let toArr = []
    let prefixes = await PREFIXES.find({})
    for (let prefix of prefixes) toArr.push(prefix.name)

    return toArr
  }

  static async setPrefix(
    this: ReturnModelType<typeof User>,
    name: string,
    prefix: string,
  ) {
    if (!(await PREFIXES.findOne({ name: prefix })))
      throw new TechnicalError('prefix', TechnicalCause.NOT_EXIST)
    const user = await this.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    user.prefix = prefix
    await user.save()
    return true
  }

  static async generateTestData(
    this: ReturnModelType<typeof User>,
    testDocumentsCount: number = 4,
    needRelation: boolean = true,
  ) {
    let users = []
    for (let i = 1; i < testDocumentsCount + 1; i++)
      users.push(await this._generateTestDocument())

    if (!needRelation) return users

    let promises = []

    for (let user of users) {
      await user._getTestRelations()
      promises.push(this.findById(user))
    }

    return Promise.all(promises) as unknown as Promise<DocumentType<User>[]>
  }

  static async getTestData(this: ReturnModelType<typeof User>) {
    return this.find({
      'profile.username': { $regex: 'test_' },
      'credentials.email': { $regex: 'test_' },
    }) as unknown as Promise<DocumentType<User>[]>
  }

  static async deleteTestData(this: ReturnModelType<typeof User>) {
    let documents = await this.getTestData()
    for (let document of documents) {
      await TaskListModel.deleteForUser(document)
      await document.delete()
    }

    return true
  }

  static async getGRI(
    this: ReturnModelType<typeof User>,
    name: string,
  ): Promise<number> {
    let user = (await this.findOne({
      'profile.username': name,
    }).exec()) as unknown as DocumentType<User>

    return user.GRI
  }

  async setPrefix(this: DocumentType<User>, prefix: string) {
    if (!(await PREFIXES.findOne({ name: prefix })))
      throw new TechnicalError('prefix', TechnicalCause.NOT_EXIST)
    this.prefix = prefix
  }

  /* PASSWORD */

  validatePassword(this: DocumentType<User>, password: string) {
    if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)

    if (this.credentials.password !== generateHash(password))
      throw new TechnicalError('password', TechnicalCause.INVALID)
    return true
  }

  setPassword(this: DocumentType<User>, password: string) {
    if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)

    this.credentials.password = generateHash(password)
    return true
  }

  /* RELATIONS */

  /* SUBSCRIBERS */

  async getSubscribers() {
    let promises = []
    for (let subscriber of this.profile.relations.subscribers)
      promises.push(UserModel.findByName(subscriber))

    let users = (await Promise.all(promises)) as DocumentType<User>[]
    return this._getRelationRecordsForUsers(users)
  }

  hasSubscriber(this: DocumentType<User>, name: string) {
    return this.profile.relations.subscribers.includes(name)
  }

  addSubscriber(this: DocumentType<User>, name: string) {
    if (this.hasSubscriber(name)) return

    this.profile.relations.subscribers.push(name)
  }

  deleteSubscriber(this: DocumentType<User>, name: string) {
    if (!this.hasSubscriber(name)) return
    let subscribers = this.profile.relations.subscribers

    let subscriberIndex = subscribers.indexOf(name)

    if (~subscriberIndex) subscribers.splice(subscriberIndex, 1)
  }

  /* FRIENDS */

  async getFriends() {
    let promises = []
    for (let friend of this.profile.relations.friends)
      promises.push(UserModel.findByName(friend))

    let users = (await Promise.all(promises)) as DocumentType<User>[]
    return this._getRelationRecordsForUsers(users)
  }

  hasFriend(this: DocumentType<User>, name: string) {
    return this.profile.relations.friends.includes(name)
  }

  addFriend(this: DocumentType<User>, name: string) {
    if (this.hasFriend(name)) return

    this.profile.relations.friends.push(name)
  }

  deleteFriend(this: DocumentType<User>, name: string) {
    if (!this.hasFriend(name)) return

    let friends = this.profile.relations.friends
    let friendIndex = friends.indexOf(name)

    if (~friendIndex) friends.splice(friendIndex, 1)
  }

  /* RELATION ACTIONS */

  async addRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new TechnicalError('name', TechnicalCause.REQUIRED)
    if (this.hasFriend(name))
      throw new TechnicalError('user relation', TechnicalCause.ALREADY_EXIST)

    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    if (!this.hasSubscriber(name)) {
      user.addSubscriber(this.profile.username)
      await user.save()
      return true
    }
    this.deleteSubscriber(name)

    user.addFriend(this.profile.username)
    this.addFriend(user.profile.username)

    await Promise.all([user.save(), this.save()])
    return true
  }

  async dropRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new TechnicalError('name', TechnicalCause.REQUIRED)
    if (!this.hasFriend(name))
      throw new TechnicalError('user relation', TechnicalCause.NOT_EXIST)

    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    if (!user.hasFriend(this.profile.username))
      throw new TechnicalError('user relation', TechnicalCause.NOT_EXIST)

    user.deleteFriend(this.profile.username)
    this.deleteFriend(name)

    this.addSubscriber(name)

    await Promise.all([user.save(), this.save()])
    return true
  }

  /* SIMPLE ACTIONS */
  async setAvatar(this: DocumentType<User>, ID: string) {
    let image = await ImageModel.findById(ID)
    if (!image) throw new TechnicalError('image', TechnicalCause.NOT_EXIST)

    this.profile.avatar = ID
    await this.save()

    return true
  }

  async isPremium(this: DocumentType<User>) {
    await this._checkPremium()
    return this.premium.isPremium
  }

  async extendPremium(this: DocumentType<User>, period: number) {
    let premiumPeriod = await PERIODS.findByPeriod(period)
    if (!premiumPeriod)
      throw new TechnicalError('period', TechnicalCause.NOT_EXIST)

    this.buy(premiumPeriod.price)
    this._extendPremiumStatus(period)
    await this.save()
    return true
  }

  buy(this: DocumentType<User>, itemPrice: number) {
    if (itemPrice < 0)
      throw new TechnicalError('user balance', TechnicalCause.NEED_HIGHER_VALUE)
    this.profile.balance -= itemPrice
  }

  addMP(amount: number) {
    this.profile.balance += amount
  }

  get GRI() {
    return this.rating.GRI
  }

  /* PRIVATE */

  private static async getRandomID() {
    let id = getRandom(5000000, 100000000000000)
    while (await UserModel.findOne({ id }))
      id = getRandom(5000000, 100000000000000)

    return id
  }

  private static async _generateTestDocument(
    this: ReturnModelType<typeof User>,
  ) {
    let testUserData = await Promise.all([
      this.getRandomID(),
      this._getRandomEmail(),
      this._getRandomNickname(),
      this._getRandomUsername(),
    ])
    let user = new this({
      id: testUserData[0],
      credentials: {
        email: testUserData[1],
        region: 'Europe',
      },
      profile: {
        nickname: testUserData[2],
        username: testUserData[3],
      },
    })
    user.setPassword(generatePassword())
    user.rating.GRI = getRandom(100, 2000)

    await user.save()
    await TaskListModel.getForUser(user)

    return user
  }

  private static async _getRandomNickname(this: ReturnModelType<typeof User>) {
    let name: string = `${generateName(1)}_${getRandom(1, 99)}`

    while (await this.findOne({ 'profile.nickname': name }))
      name = `${generateName(1)}_${getRandom(1, 99)}`

    return name
  }

  private static async _getRandomUsername(this: ReturnModelType<typeof User>) {
    let name: string = `test_${generateName(1)}_${getRandom(1, 99)}`
    while (await this.findOne({ 'profile.username': name }))
      name = `test_${generateName(1)}_${getRandom(1, 99)}`

    return name
  }

  private static async _getRandomEmail(this: ReturnModelType<typeof User>) {
    let email: string = `test_${generateName(1)}${getRandom(1, 1000)}@test.com`
    while (await this.findOne({ 'credentials.email': email }))
      email = `test_${generateName(1)}${getRandom(1, 1000)}@test.com`

    return email
  }

  private async _getTestRelations(
    this: DocumentType<User>,
    needFriendsCount: number = 4,
  ) {
    let users = await UserModel.getTestData()
    for (let friendsCount = 0; friendsCount < needFriendsCount; friendsCount++)
      await this.addRelation(users[friendsCount].profile.username)
    await Promise.all([
      users[0].addRelation(this.profile.username),
      users[1].addRelation(this.profile.username),
    ])
  }

  private async _checkPremium(this: DocumentType<User>) {
    if (!this.premium.isPremium) return
    if (
      !this.premium.expiresIn ||
      0 >= this.premium.expiresIn.getTime() - Date.now()
    ) {
      this.premium.isPremium = false
      await this.save()
      return
    }
  }

  private async _extendPremiumStatus(this: DocumentType<User>, months: number) {
    let now = new Date()
    now.setMonth(now.getMonth() + months)

    this.premium.expiresIn = now
    this.premium.isPremium = true
  }

  private async _getRelationRecordsForUsers(users: DocumentType<User>[]) {
    let promises = []
    let result = []
    for (let user of users) {
      let record = new RelationRecord(
        user.profile.username,
        user.profile.avatar,
      )
      promises.push(record.load())
      result.push(record)
    }

    await Promise.all(promises)
    return result
  }
}
