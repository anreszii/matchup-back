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
import { Guild, GuildModel } from '../index'

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
  @prop({ required: true })
  level!: Level
  @prop({ required: true, default: 0 })
  rating!: Rating
  @prop({ required: true })
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

  public async validatePassword(this: DocumentType<User>, password: string) {
    if (!password)
      throw new ValidationError('password', validationCause.REQUIRED)

    if (this.credentials.password !== generateHash(password))
      throw new ValidationError('password', validationCause.INVALID)
  }

  public async setPassword(this: DocumentType<User>, password: string) {
    if (!password)
      throw new ValidationError('password', validationCause.REQUIRED)

    this.credentials.password = generateHash(password)
    return this.save()
  }

  /* RELATIONS */

  /* SUBSCRIBERS */

  public getSubscriberList(this: DocumentType<User>) {
    return this.profile.relations.subscribers
  }

  public hasSubscriber(this: DocumentType<User>, name: string) {
    return this.profile.relations.subscribers.includes(name)
  }

  public async addSubscriber(this: DocumentType<User>, name: string) {
    if (this.hasSubscriber(name)) return

    this.profile.relations.subscribers.push(name)

    return this.save()
  }

  public async deleteSubscriber(this: DocumentType<User>, name: string) {
    if (!this.hasSubscriber(name)) return
    let subscribers = this.profile.relations.subscribers

    let subscriberIndex = subscribers.indexOf(name)

    if (~subscriberIndex) {
      subscribers.splice(subscriberIndex, 1)
      return this.save()
    }
  }

  /* FRIENDS */

  public getFriendList(this: DocumentType<User>) {
    return this.profile.relations.friends
  }

  public hasFriend(this: DocumentType<User>, name: string) {
    return this.profile.relations.friends.includes(name)
  }

  public async addFriend(this: DocumentType<User>, name: string) {
    if (this.hasSubscriber(name)) return

    this.profile.relations.friends.push(name)

    return this.save()
  }

  public async deleteFriend(this: DocumentType<User>, name: string) {
    if (!this.hasSubscriber(name)) return
    let friends = this.profile.relations.friends

    let friendIndex = friends.indexOf(name)

    if (~friendIndex) {
      friends.splice(friendIndex, 1)
      return this.save()
    }
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

    await user.addFriend(this.profile.username)
    await this.deleteSubscriber(name)

    return this.addFriend(user.profile.username)
  }

  public async dropRelation(this: DocumentType<User>, name: string) {
    if (!name) throw new ValidationError('name', validationCause.REQUIRED)
    if (!this.hasFriend(name)) return

    let user = await UserModel.findByName(name)
    if (!user?.hasFriend(this.profile.username)) return

    await this.deleteFriend(name)
    await user.deleteFriend(this.profile.username)

    return this.addSubscriber(name)
  }

  /* GUILD */

  public async joinGuild(this: DocumentType<User>, guildID: Types.ObjectId) {
    let Guild = await GuildModel.findById(guildID)
    if (!Guild || !Guild.hasMember(this.profile.username)) return

    this.guild = guildID
    return this.save()
  }

  public async leaveGuild(this: DocumentType<User>) {}

  public getGRI(this: DocumentType<User>) {
    return this.rating.GRI
  }

  public async buy(this: DocumentType<User>, itemPrice: number) {
    if (itemPrice < 0) throw new Error('Need more money')
    this.profile.balance -= itemPrice
    return this.save()
  }
}

export const UserModel = getModelForClass(User)
