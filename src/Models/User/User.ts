import type { USER_PREFIX, USER_ROLE } from '../../Interfaces'
import type { Types } from 'mongoose'

import {
  prop,
  getModelForClass,
  ReturnModelType,
  DocumentType,
  Ref,
} from '@typegoose/typegoose'

import { ValidationError, validationCause } from '../../error'
import { Credentials } from './Credentials'
import { Level } from './Level'
import { Profile } from './Profile'
import { generateHash } from '../../Utils'
import { Rating } from '../MatchMaking/Rating'
import { BPLevelModel, Guild, GuildModel } from '../index'

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
  @prop({ required: true })
  credentials!: Credentials
  @prop({ required: true })
  profile!: Profile
  @prop({
    required: true,
    default: { currentBPLevel: 0, currentRequiredEXP: 0, currentEXP: 0 },
  })
  level!: Level
  @prop({ required: true, default: { GRI: 0, GS: 0, GSI: 1, WS: 0, LC: 0 } })
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

  public static async getGRI(
    this: ReturnModelType<typeof User>,
    name: string,
  ): Promise<number> {
    let user = (await this.findOne({
      'profile.username': name,
    }).exec()) as unknown as DocumentType<User>

    return user.getGRI()
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
    if (this.hasSubscriber(name)) return

    this.profile.relations.friends.push(name)
  }

  public deleteFriend(this: DocumentType<User>, name: string) {
    if (!this.hasSubscriber(name)) return
    let friends = this.profile.relations.friends

    let friendIndex = friends.indexOf(name)

    if (~friendIndex) friends.splice(friendIndex, 1)
  }

  /* RELATION ACTIONS */

  public async addRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new ValidationError('name', validationCause.REQUIRED)
    if (this.hasFriend(name)) return

    let user = await UserModel.findByName(name)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)

    if (!this.hasSubscriber(name)) {
      return user.addSubscriber(this.profile.username)
    }

    user.addFriend(this.profile.username)

    this.deleteSubscriber(name)
    this.addFriend(user.profile.username)

    await user.save()
    return this.save()
  }

  public async dropRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new ValidationError('name', validationCause.REQUIRED)
    if (!this.hasFriend(name)) return

    let user = await UserModel.findByName(name)
    if (!user?.hasFriend(this.profile.username)) return

    this.deleteFriend(name)
    this.addSubscriber(name)

    user.deleteFriend(this.profile.username)

    await user.save()
    return this.save()
  }

  /* GUILD */

  public joinGuild(this: DocumentType<User>, guildID: Types.ObjectId) {
    GuildModel.findById(guildID).then((Guild) => {
      if (!Guild || !Guild.hasMember(this.profile.username)) return

      this.guild = guildID
    })
  }

  public leaveGuild(this: DocumentType<User>) {
    if (!this.guild) return
    this.guild = undefined
    return
  }

  /* SIMPLE ACTIONS */

  public getGRI(this: DocumentType<User>) {
    return this.rating.GRI
  }

  public buy(this: DocumentType<User>, itemPrice: number) {
    if (itemPrice < 0) throw new Error('Need more money')
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
    if (this.level.currentEXP >= this.level.currentRequiredEXP)
      this._updateLevel()
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
}

export const UserModel = getModelForClass(User)
