import type { USER_ROLE } from '../../Interfaces'

import { prop, ReturnModelType, DocumentType, Ref } from '@typegoose/typegoose'

import { Profile } from './Profile'
import { Credentials } from './Credentials'
import { Rating } from '../MatchMaking/Rating'
import { UserLevel as Level } from './BattlePassLevel'

import { TaskListModel, UserModel } from '../'
import { Guild } from '../Guild/Guild'
import { PREFIXES } from '../../configs/prefixes'

import { generatePassword } from '../../Utils/passwordGenerator'
import { generateName } from '../../Utils/nameGenerator'
import { TechnicalCause, TechnicalError } from '../../error'
import { RelationRecord } from './Relations'
import { BPLevelModel } from '../Task/BattlePassLevel'
import { generateHash } from '../../Utils/hashGenerator'
import { getRandom } from '../../Utils/math'

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

  static async getPrefixes() {
    return PREFIXES
  }

  static async setPrefix(
    this: ReturnModelType<typeof User>,
    name: string,
    prefix: string,
  ) {
    if (!PREFIXES.includes(prefix))
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

  setPrefix(this: DocumentType<User>, prefix: string) {
    if (!PREFIXES.includes(prefix))
      throw new TechnicalError('prefix', TechnicalCause.NOT_EXIST)
    this.prefix = prefix
  }

  /* PASSWORD */

  validatePassword(this: DocumentType<User>, password: string) {
    if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)

    if (this.credentials.password !== generateHash(password))
      throw new TechnicalError('password', TechnicalCause.INVALID)
  }

  setPassword(this: DocumentType<User>, password: string) {
    if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)

    this.credentials.password = generateHash(password)
    return
  }

  /* RELATIONS */

  /* SUBSCRIBERS */

  async getSubscribers() {
    let result: RelationRecord[] = []
    for (let subscriber of this.profile.relations.subscribers)
      result.push(new RelationRecord(subscriber))

    return result
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
    let result: RelationRecord[] = []
    for (let friend of this.profile.relations.friends)
      result.push(new RelationRecord(friend))

    return result
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
    user.setPrefix('Test')
    user.setPassword(generatePassword())

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
}
