import type { USER_PREFIX, USER_ROLE } from '../../Interfaces'
import type { Types } from 'mongoose'

import { prop, ReturnModelType, DocumentType, Ref } from '@typegoose/typegoose'

import { ValidationError, validationCause } from '../../error'
import { Credentials } from './Credentials'
import { UserLevel as Level } from './BattlePassLevel'
import { Profile } from './Profile'
import { generateHash, generatePassword, getRandom } from '../../Utils'
import { Rating } from '../MatchMaking/Rating'
import { BPLevelModel, GuildModel, TaskListModel } from '../index'
import { Guild } from '../Guild/Guild'
import { UserModel } from '../'
import { DTOError, PERFORMANCE_ERRORS } from '../../Classes/DTO/error'
import { generateName } from '../../Utils/nameGenerator'

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
  prefix?: USER_PREFIX
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
    if (!password)
      throw new ValidationError('password', validationCause.REQUIRED)

    if (this.credentials.password !== generateHash(password))
      throw new ValidationError('password', validationCause.INVALID)
  }

  public setPassword(this: DocumentType<User>, password: string) {
    if (!password)
      throw new ValidationError('password', validationCause.REQUIRED)

    this.credentials.password = generateHash(password)
    return
  }

  /* RELATIONS */

  /* SUBSCRIBERS */

  public getSubscriberList(this: DocumentType<User>) {
    return this.profile.relations.subscribers
  }

  public hasSubscriber(this: DocumentType<User>, name: string) {
    return this.profile.relations.subscribers.includes(name)
  }

  public addSubscriber(this: DocumentType<User>, name: string) {
    if (this.hasSubscriber(name)) return

    this.profile.relations.subscribers.push(name)
  }

  public deleteSubscriber(this: DocumentType<User>, name: string) {
    if (!this.hasSubscriber(name)) return
    let subscribers = this.profile.relations.subscribers

    let subscriberIndex = subscribers.indexOf(name)

    if (~subscriberIndex) {
      subscribers.splice(subscriberIndex, 1)
    }
  }

  /* FRIENDS */

  public getFriendList(this: DocumentType<User>) {
    return this.profile.relations.friends
  }

  public hasFriend(this: DocumentType<User>, name: string) {
    return this.profile.relations.friends.includes(name)
  }

  public addFriend(this: DocumentType<User>, name: string) {
    if (this.hasFriend(name)) return

    this.profile.relations.friends.push(name)
  }

  public deleteFriend(this: DocumentType<User>, name: string) {
    if (!this.hasFriend(name)) return

    let friends = this.profile.relations.friends
    let friendIndex = friends.indexOf(name)

    if (~friendIndex) friends.splice(friendIndex, 1)
  }

  /* RELATION ACTIONS */

  public async addRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new ValidationError('username', validationCause.REQUIRED)
    if (this.hasFriend(name))
      throw new DTOError(PERFORMANCE_ERRORS["can't add relation"])

    let user = await UserModel.findByName(name)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)

    if (!this.hasSubscriber(name)) {
      user.addSubscriber(this.profile.username)
      return user.save()
    }

    user.addFriend(this.profile.username)
    await user.save()

    this.deleteSubscriber(name)
    this.addFriend(user.profile.username)
    return this.save()
  }

  public async dropRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new ValidationError('name', validationCause.REQUIRED)
    if (!this.hasFriend(name))
      throw new DTOError(PERFORMANCE_ERRORS["can't drop relation"])

    let user = await UserModel.findByName(name)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)
    if (!user.hasFriend(this.profile.username))
      throw new DTOError(PERFORMANCE_ERRORS["can't drop relation"])

    user.deleteFriend(this.profile.username)
    await user.save()

    this.deleteFriend(name)
    this.addSubscriber(name)
    return this.save()
  }

  /* GUILD */

  public joinGuild(this: DocumentType<User>, guildID: Types.ObjectId) {
    GuildModel.findById(guildID).then((Guild) => {
      if (!Guild || !Guild.hasMember(this.profile.username))
        throw new ValidationError('guild', validationCause.NOT_EXIST)

      this.guild = guildID
    })
  }

  public leaveGuild(this: DocumentType<User>) {
    if (!this.guild)
      throw new ValidationError('guild', validationCause.REQUIRED)
    this.guild = undefined
  }

  /* SIMPLE ACTIONS */

  public get GRI() {
    return this.rating.GRI
  }

  public buy(this: DocumentType<User>, itemPrice: number) {
    if (itemPrice < 0) throw new DTOError(PERFORMANCE_ERRORS['low balance'])
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
