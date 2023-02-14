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

import {
  MatchListModel,
  NotificationModel,
  TaskListModel,
  UserModel,
} from '../'

import { Match } from '../MatchMaking/Matchs'
import { Guild } from '../Guild/Guild'

import { generatePassword } from '../../Utils/passwordGenerator'
import { generateName } from '../../Utils/nameGenerator'
import { TechnicalCause, TechnicalError } from '../../error'
import { RelationRecord } from './Relations'
import { generateHash } from '../../Utils/hashGenerator'
import { getRandom } from '../../Utils/math'
import { ImageModel } from '../Image'
import { PERIODS, Premium } from './Premium'
import { NotificationQueue } from './Notify/Queue'
import { clientServer } from '../../API/Sockets/clientSocketServer'
import { DTO } from '../../Classes/DTO/DTO'
import { isValidObjectId, Types } from 'mongoose'

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
  @prop({ ref: () => Match, default: [] })
  match_list!: Ref<Match>[]

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

  async notify(this: DocumentType<User>, content: string) {
    return this._getNotificationQueue()
      .then(async (notifications) => {
        notifications.push(content).catch((e) => {
          console.error(e)
        })

        return true
      })
      .catch((e) => {
        throw e
      })
  }

  /* RELATIONS */

  /* SUBSCRIBERS */

  async getSubscribers() {
    let promises = []
    for (let subscriber of this.profile.relations.subscribers)
      promises.push(UserModel.findById(subscriber))

    let users = (await Promise.all(promises)) as DocumentType<User>[]
    return this._getRelationRecordsForUsers(users)
  }

  hasSubscriber(this: DocumentType<User>, id: Types.ObjectId) {
    return this.profile.relations.subscribers.includes(id)
  }

  addSubscriber(this: DocumentType<User>, id: Types.ObjectId) {
    if (this.hasSubscriber(id)) return

    this.profile.relations.subscribers.push(id)
  }

  deleteSubscriber(this: DocumentType<User>, name: Types.ObjectId) {
    if (!this.hasSubscriber(name)) return
    let subscribers = this.profile.relations.subscribers

    let subscriberIndex = subscribers.indexOf(name)

    if (~subscriberIndex) subscribers.splice(subscriberIndex, 1)
  }

  /* FRIENDS */

  async getFriends() {
    let promises = []
    for (let friend of this.profile.relations.friends)
      promises.push(UserModel.findById(friend))

    let users = (await Promise.all(promises)) as DocumentType<User>[]
    return this._getRelationRecordsForUsers(users)
  }

  hasFriend(this: DocumentType<User>, id: Types.ObjectId) {
    return this.profile.relations.friends.includes(id)
  }

  addFriend(this: DocumentType<User>, id: Types.ObjectId) {
    if (this.hasFriend(id)) return

    this.profile.relations.friends.push(id)
  }

  deleteFriend(this: DocumentType<User>, name: Types.ObjectId) {
    if (!this.hasFriend(name)) return

    let friends = this.profile.relations.friends
    let friendIndex = friends.indexOf(name)

    if (~friendIndex) friends.splice(friendIndex, 1)
  }

  /* RELATION ACTIONS */

  async addRelation(this: DocumentType<User>, id: Types.ObjectId | string) {
    if (!id) throw new TechnicalError('id', TechnicalCause.REQUIRED)

    let user
    if (!isValidObjectId(id)) user = await UserModel.findByName(id as string)
    else user = await UserModel.findById(id)

    if (!user || String(this._id) == String(user._id))
      throw new TechnicalError('id', TechnicalCause.INVALID)

    if (this.hasFriend(user._id))
      throw new TechnicalError('user relation', TechnicalCause.ALREADY_EXIST)

    if (!this.hasSubscriber(user._id)) {
      user.addSubscriber(this._id)
      await user.save()
      return true
    }
    this.deleteSubscriber(user._id)

    user.addFriend(this._id)
    this.addFriend(user._id)

    user.notify(`${this.profile.username} принял ваш запрос в друзья`)

    await Promise.all([user.save(), this.save()])
    return true
  }

  async dropRelation(this: DocumentType<User>, id: Types.ObjectId | string) {
    if (!id) throw new TechnicalError('id', TechnicalCause.REQUIRED)

    let user
    if (!isValidObjectId(id)) user = await UserModel.findByName(id as string)
    else user = await UserModel.findById(id)

    if (!user || String(this._id) == String(user._id))
      throw new TechnicalError('id', TechnicalCause.INVALID)

    if (!this.hasFriend(user._id))
      throw new TechnicalError('user relation', TechnicalCause.NOT_EXIST)

    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    if (!user.hasFriend(this._id)) {
      if (!user.hasSubscriber(this._id))
        throw new TechnicalError('user relation', TechnicalCause.NOT_EXIST)
      user.deleteSubscriber(this._id)
      await user.save()
      return true
    }

    user.deleteFriend(this._id)
    this.deleteFriend(user._id)

    this.addSubscriber(user._id)

    await Promise.all([user.save(), this.save()])
    return true
  }

  /* SIMPLE ACTIONS */
  async setAvatar(this: DocumentType<User>, ID: string) {
    this.profile.avatar = ID
    await this.save()

    return true
  }

  async addMatchLog(this: DocumentType<User>, ID: Types.ObjectId) {
    if (!(await MatchListModel.findById(ID)))
      throw new TechnicalError('match', TechnicalCause.NOT_EXIST)
    const set = new Set(this.match_list.map((value) => String(value)))
    set.add(String(ID))
    this.match_list = Array.from(set) as unknown as Types.ObjectId[]
    await this.save()

    return true
  }

  isPremium(this: DocumentType<User>) {
    let result = this._checkPremium()
    if (typeof result == 'boolean') return this.premium.isPremium

    return result.then(() => this.premium.isPremium)
  }

  extendPremium(this: DocumentType<User>, period: number) {
    return PERIODS.findByPeriod(period).then((premiumPeriod) => {
      if (!premiumPeriod)
        throw new TechnicalError('period', TechnicalCause.NOT_EXIST)

      this.buy(premiumPeriod.price)
      this._extendPremiumStatus(period)
      return this.save().then(() => true)
    })
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
    needFriendsCount: number = 2,
  ) {
    let users = await UserModel.getTestData()
    let friendsCount = 0
    for (let i = 0; i < users.length || friendsCount < needFriendsCount; i++) {
      if (String(users[i]._id) == String(this._id)) continue
      await this.addRelation(users[i]._id)
      if (Math.random() > 0.5) await users[i].addRelation(this._id)
      friendsCount++
    }
  }

  private async _getNotificationQueue(
    this: DocumentType<User>,
  ): Promise<DocumentType<NotificationQueue>> {
    return NotificationModel.getForUser(this)
  }

  private _checkPremium(this: DocumentType<User>) {
    if (!this.premium.isPremium) return false
    if (
      !this.premium.expiresIn ||
      0 >= this.premium.expiresIn.getTime() - Date.now()
    ) {
      this.premium.isPremium = false
      return this.save().then(() => true)
    }
    return false
  }

  private _extendPremiumStatus(this: DocumentType<User>, months: number) {
    let status = this.isPremium()
    let now = new Date()
    if (typeof status == 'boolean' && status && this.premium.expiresIn)
      now = this.premium.expiresIn
    now.setMonth(now.getMonth() + months)

    this.premium.expiresIn = now
    this.premium.isPremium = true
  }

  private async _getRelationRecordsForUsers(users: DocumentType<User>[]) {
    let result = []
    for (let user of users) {
      let record = new RelationRecord(
        user.profile.username,
        user.profile.avatar as unknown as string,
      )
      result.push(record)
    }
    return result
  }
}
