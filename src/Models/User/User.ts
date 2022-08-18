import {
  prop,
  getModelForClass,
  Ref,
  ReturnModelType,
  DocumentType,
  SubDocumentType,
} from '@typegoose/typegoose'

import { ValidationError, validationCause } from '../../error'
import validator from 'validator'

import { USER_ROLE } from '../../Interfaces'
import { Credentials } from './Credentials'
import { Level } from './Level'
import { Profile } from './Profile'
import { generateHash } from '../../Utils'

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
  @prop({ type: () => Credentials })
  credentials!: SubDocumentType<Credentials>
  @prop({ type: () => Profile })
  profile!: SubDocumentType<Profile>
  @prop({ type: () => Level })
  level!: SubDocumentType<Level>
  @prop({ required: true })
  role!: USER_ROLE

  public static async getByName(
    this: ReturnModelType<typeof User>,
    name: string,
  ): Promise<DocumentType<User>> {
    return this.findOne({
      'profile.username': name,
    }).exec() as unknown as DocumentType<User>
  }

  /* PASSWORD */

  public static validatePasswordFormat(password: string) {
    if (!password)
      throw new ValidationError('password', validationCause.REQUIRED)
    if (
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 0,
        minSymbols: 0,
      })
    )
      throw new ValidationError('password', validationCause.INVALID_FORMAT)
  }

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

    let user = await UserModel.getByName(name)
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

    let user = await UserModel.getByName(name)
    if (!user?.hasFriend(this.profile.username)) return

    await this.deleteFriend(name)
    await user.deleteFriend(this.profile.username)

    return this.addSubscriber(name)
  }
}

export const UserModel = getModelForClass(User)
