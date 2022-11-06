import type { USER_ROLE } from '../../Interfaces'
import type { Types } from 'mongoose'

import { prop, ReturnModelType, DocumentType, Ref } from '@typegoose/typegoose'

import { Profile } from './Profile'
import { Credentials } from './Credentials'
import { Rating } from '../MatchMaking/Rating'
import { UserLevel as Level } from './BattlePassLevel'

import { UserModel } from '../'
import { Guild } from '../Guild/Guild'
import { BPLevelModel, GuildModel, TaskListModel } from '../index'
import { PREFIXES } from '../../configs/prefixes'

import { generateHash, generatePassword, getRandom } from '../../Utils'
import { generateName } from '../../Utils/nameGenerator'
import { TechnicalCause, TechnicalError } from '../../error'

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
    default: new Level(),
    _id: false,
  })
  level!: Level
  @prop({
    required: true,
    default: new Rating(),
    _id: false,
  })
  rating!: Rating
  @prop({ required: true, default: 'default' })
  role!: USER_ROLE
  @prop()
  prefix?: string
  @prop({ ref: () => Guild })
  guild?: Ref<Guild>

  public static async findByName(
    this: ReturnModelType<typeof User>,
    name: string,
  ): Promise<DocumentType<User>> {
    return this.findOne({
      'profile.username': name,
    }).exec() as unknown as DocumentType<User>
  }

  public static async findByEmail(
    this: ReturnModelType<typeof User>,
    email: string,
  ) {
    return this.findOne({
      'credentials.email': email,
    }).exec() as unknown as DocumentType<User>
  }

  public static async getPublicData(
    this: ReturnModelType<typeof User>,
    name: string,
  ) {
    return this.findOne(
      { 'profile.username': name },
      'id profile level rating role prefix guild credentials.email credentials.region',
    )
  }

  public static async getPrefixes() {
    return PREFIXES
  }

  public static setPrefix(
    this: ReturnModelType<typeof User>,
    name: string,
    prefix: string,
  ) {
    if (!PREFIXES.includes(prefix))
      throw new TechnicalError('prefix', TechnicalCause.NOT_EXIST)
    return this.findByName(name).then((user) => {
      if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
      user.prefix = prefix
      return user.save().then(() => user)
    })
  }

  public static async generateTestData(
    this: ReturnModelType<typeof User>,
    testDocumentsCount: number = 4,
  ) {
    let generatedUsers: DocumentType<User>[] = []
    for (let i = 1; i < testDocumentsCount + 1; i++) {
      let document = new this({
        id: await this.getRandomID(),
        credentials: {
          email: await this.getRandomEmail(),
          region: 'Europe',
        },
        profile: {
          nickname: await this.getRandomNickname(),
          username: await this.getRandomUsername(),
        },
      })
      document.setPassword(generatePassword())
      await document.save()
      await TaskListModel.getForUser(document)

      generatedUsers.push(document)
    }

    return generatedUsers
  }

  public static async getTestData(this: ReturnModelType<typeof User>) {
    return this.find({
      'profile.username': { $regex: 'test_' },
      'credentials.email': { $regex: 'test_' },
    })
  }

  public static async deleteTestData(this: ReturnModelType<typeof User>) {
    let documents = await this.getTestData()
    for (let document of documents) {
      await TaskListModel.deleteForUser(document)
      await document.delete()
    }
  }

  public static async getGRI(
    this: ReturnModelType<typeof User>,
    name: string,
  ): Promise<number> {
    let user = (await this.findOne({
      'profile.username': name,
    }).exec()) as unknown as DocumentType<User>

    return user.GRI
  }

  /* PASSWORD */

  public validatePassword(this: DocumentType<User>, password: string) {
    if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)

    if (this.credentials.password !== generateHash(password))
      throw new TechnicalError('password', TechnicalCause.INVALID)
  }

  public setPassword(this: DocumentType<User>, password: string) {
    if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)

    this.credentials.password = generateHash(password)
    return
  }

  /* RELATIONS */

  /* SUBSCRIBERS */

  get subscriberList() {
    return this.profile.relations.subscribers
  }

  hasSubscriber(this: DocumentType<User>, name: string) {
    for (let subscriber of this.profile.relations.subscribers)
      if (subscriber.name == name) return true

    return false
  }

  async addSubscriber(this: DocumentType<User>, name: string) {
    if (this.hasSubscriber(name)) return

    const image = await UserModel.findOne(
      { 'profile.username': name },
      'profile.avatar',
    )
    this.profile.relations.subscribers.push({
      name,
      avatar: image?.profile.avatar,
    })
  }

  deleteSubscriber(this: DocumentType<User>, name: string) {
    if (!this.hasSubscriber(name)) return

    let subscribers = this.profile.relations.subscribers
    let subscriberIndex = subscribers.findIndex((record) => record.name == name)

    if (~subscriberIndex) subscribers.splice(subscriberIndex, 1)
  }

  /* FRIENDS */

  get friendList() {
    return this.profile.relations.friends
  }

  hasFriend(this: DocumentType<User>, name: string) {
    for (let friend of this.profile.relations.friends)
      if (friend.name == name) return true

    return false
  }

  async addFriend(this: DocumentType<User>, name: string) {
    if (this.hasFriend(name)) return

    const image = await UserModel.findOne(
      { 'profile.username': name },
      'profile.avatar',
    )

    this.profile.relations.friends.push({
      name,
      avatar: image?.profile.avatar,
    })
  }

  deleteFriend(this: DocumentType<User>, name: string) {
    if (!this.hasFriend(name)) return

    let friends = this.profile.relations.friends
    let friendIndex = friends.findIndex((record) => record.name == name)

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
      await user.addSubscriber(this.profile.username)
      return user.save()
    }

    await user.addFriend(this.profile.username)
    await user.save()

    this.deleteSubscriber(name)
    this.addFriend(user.profile.username)
    return this.save()
  }

  async dropRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new TechnicalError('name', TechnicalCause.REQUIRED)
    if (!this.hasFriend(name))
      throw new TechnicalError('user relation', TechnicalCause.NOT_EXIST)

    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    if (!user.hasFriend(this.profile.username))
      throw new TechnicalError('user relation', TechnicalCause.NOT_EXIST)

    await user.deleteFriend(this.profile.username)
    await user.save()

    this.deleteFriend(name)
    this.addSubscriber(name)
    return this.save()
  }

  /* GUILD */

  public joinGuild(this: DocumentType<User>, guildID: Types.ObjectId) {
    GuildModel.findById(guildID).then((Guild) => {
      if (!Guild || !Guild.hasMember(this.profile.username))
        throw new TechnicalError('guild', TechnicalCause.NOT_EXIST)

      this.guild = guildID
    })
  }

  public leaveGuild(this: DocumentType<User>) {
    if (!this.guild) throw new TechnicalError('guild', TechnicalCause.REQUIRED)
    this.guild = undefined
  }

  /* SIMPLE ACTIONS */

  public get GRI() {
    return this.rating.GRI
  }

  public buy(this: DocumentType<User>, itemPrice: number) {
    if (itemPrice < 0)
      throw new TechnicalError('user balance', TechnicalCause.NEED_HIGHER_VALUE)
    this.profile.balance -= itemPrice
  }

  public addEXP(amount: number) {
    this.level.currentEXP += amount
  }

  public addMP(amount: number) {
    this.profile.balance += amount
  }

  /* BATTLEPASS */

  public checkLevel(this: DocumentType<User>) {
    let level = this.level
    if (this.level.currentEXP >= this.level.currentRequiredEXP)
      this._updateLevel()

    return { previous: level, current: this.level }
  }

  private _updateLevel(this: DocumentType<User>) {
    this._collectRewardsFromBP()
    BPLevelModel.findOne({
      level: this.level.currentBPLevel + 1,
    }).then((newLevel) => {
      if (!newLevel) return
      this.level.currentRequiredEXP = newLevel.requiredEXP
      this.level.currentBPLevel += 1
      this.level.reward = newLevel.reward
    })
  }

  private _collectRewardsFromBP(this: DocumentType<User>) {
    let reward = this.level.reward
    if (!reward) return
    switch (reward.type) {
      case 'mp': {
        this.addMP(reward.amount)
        break
      }
      case 'exp': {
        this.addEXP(reward.amount)
        break
      }
    }

    this.level.reward = undefined
  }

  private static async getRandomID() {
    let id = getRandom(5000000, 100000000000000)
    while (await UserModel.findOne({ id }))
      id = getRandom(5000000, 100000000000000)

    return id
  }

  private static async getRandomNickname() {
    let name: string = `${generateName(1)}_${getRandom(1, 99)}`

    while (await UserModel.findOne({ 'profile.nickname': name }))
      name = `${generateName(1)}_${getRandom(1, 99)}`

    return name
  }

  private static async getRandomUsername() {
    let name: string = `test_${generateName(1)}_${getRandom(1, 99)}`
    while (await UserModel.findOne({ 'profile.username': name }))
      name = `test_${generateName(1)}_${getRandom(1, 99)}`

    return name
  }

  private static async getRandomEmail() {
    let email: string = `test_${generateName(1)}${getRandom(1, 1000)}@test.com`
    while (await UserModel.findOne({ 'credentials.email': email }))
      email = `test_${generateName(1)}${getRandom(1, 1000)}@test.com`

    return email
  }
}
