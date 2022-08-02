import type { region } from '../app'

import { Schema, Model, model, HydratedDocument, Types } from 'mongoose'
import validator from 'validator'

import { BattlePassLevelSchema, IBattlePassLevel } from './BattlePassLevel'
import { IRelations, Relations } from './Relations'

import { generateHash } from '../Utils/hashGenerator'
import { validationCause as cause, ValidationError } from '../error'

interface Level {
  currentEXP: number
  nextBPLevel: IBattlePassLevel
}

export declare interface IUser {
  id: number
  credentials: {
    password: string
    salt: string
    email: string
    region: region
  }

  profile: {
    nickname: string
    username: string
    avatar: string
    relations: IRelations
  }

  level: Level

  balance: number
}

export declare interface IUserBehavior {
  /* PASSWORD */
  validatePasswordFormat(password: string): void | never
  validatePassword(password: string): void | never
  setPassword(password: string): void | undefined | never

  /* TASKS */
  updateDailyTasks(): Promise<void> | never
  addEXP(amount: number): Promise<void> | never
  addMP(amount: number): Promise<void>

  /* RELATIONS */

  startRelation(name: string): Promise<void> | never
  endRelation(name: string): Promise<void> | never

  /* SUBSCRIBERS */
  getSubscriberList(): Array<string>
  hasSubscriber(name: string): boolean
  addSubscriber(name: string): Promise<void>
  deleteSubscriber(name: string): Promise<undefined | void>

  /* FRIENDS */
  getFriendList(): Array<string>
  hasFriend(name: string): boolean
  addFriend(name: string): Promise<void>
  deleteFriend(name: string): Promise<undefined | void>
}

interface UserModel extends Model<IUser, {}, IUserBehavior> {
  getByName(name: string): Promise<HydratedDocument<IUser, IUserBehavior>>
}

const UserSchema = new Schema<IUser, UserModel, IUserBehavior>({
  id: {
    type: Number,
    required: [true, 'id required'],
    unique: true,
    validate: {
      validator: function (v: number) {
        return v == v && v % 1 === 0
      },
      message: (props) => `invalid id format`,
    },
  },

  credentials: {
    password: {
      type: String,
      required: [true, 'password required'],
    },

    salt: {
      type: String,
    },

    email: {
      type: String,
      required: [true, 'email required'],
      unique: true,
      validate: {
        validator: function (v: string) {
          return validator.isEmail(v)
        },
        message: (props) => `invalid email format`,
      },
    },

    region: {
      type: String,
      required: [true, 'region required'],
    },
  },

  profile: {
    //Возможно будет лучше разделить на usernick / username
    nickname: {
      type: String,
      required: [true, 'nickname required'],
      unique: true,
      validate: {
        validator: function (v: string) {
          let length = v.length
          return length >= 6 && length <= 18
        },
        message: (props) => `invalid nickname format`,
      },
    },

    username: {
      type: String,
      required: [true, 'username required'],
      unique: true,
      validate: {
        validator: function (v: string) {
          let length = v.length
          return Boolean(length >= 6 && length <= 18)
        },
        message: (props) => `invalid username format`,
      },
    },

    avatar: String,

    relations: Relations,
  },

  level: new Schema<Level>({
    nextBPLevel: { type: BattlePassLevelSchema, default: undefined },
    currentEXP: { type: Number, default: 0 },
  }),

  balance: {
    type: Number,
    default: 0,
  },
})

UserSchema.statics.getByName = function (name: string) {
  return this.findOne({ 'profile.username': name })
}

/* PASSWORD */

UserSchema.methods.validatePasswordFormat = function (password) {
  if (!password) throw new ValidationError('password', cause.REQUIRED)
  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 0,
      minSymbols: 0,
    })
  )
    throw new ValidationError('password', cause.INVALID_FORMAT)
}

UserSchema.methods.validatePassword = function (password) {
  if (!password) throw new ValidationError('password', cause.REQUIRED)

  if (
    this.credentials.password !==
    generateHash(password, this.credentials.salt).hash
  )
    throw new ValidationError('password', cause.INVALID)
}

UserSchema.methods.setPassword = function (password) {
  if (!password) return
  if (
    this.credentials.password ==
    generateHash(password, this.credentials.salt).hash
  )
    return

  let result = generateHash(password)
  this.credentials.password = result.hash
  this.credentials.salt = result.usedSalt
}

/* RELATIONS */

/* SUBSCRIBERS */
UserSchema.methods.getSubscriberList = function () {
  return this.profile.relations.subscribers
}

UserSchema.methods.hasSubscriber = function (name: string) {
  return this.profile.relations.subscribers.includes(name)
}

UserSchema.methods.addSubscriber = async function (name: string) {
  if (this.hasSubscriber(name)) return

  this.profile.relations.subscribers.push(name)

  return this.save()
}

UserSchema.methods.deleteSubscriber = async function (name: string) {
  if (!this.hasSubscriber(name)) return
  let subscribers = this.profile.relations.subscribers

  let subscriberIndex = subscribers.indexOf(name)

  if (~subscriberIndex) {
    subscribers.splice(subscriberIndex, 1)
    return this.save()
  }
}

/* FRIENDS */

UserSchema.methods.getFriendList = function () {
  return this.profile.relations.friends
}

UserSchema.methods.hasFriend = function (name: string) {
  return this.profile.relations.friends.includes(name)
}

UserSchema.methods.addFriend = async function (name: string) {
  if (this.hasFriend(name)) return

  this.profile.relations.friends.push(name)

  return this.save()
}

UserSchema.methods.deleteFriend = async function (name: string) {
  if (!this.hasFriend(name)) return
  let friends = this.profile.relations.friends

  let friendIndex = friends.indexOf(name)

  if (~friendIndex) {
    friends.splice(friendIndex, 1)
    return this.save()
  }
}

/* RELATION ACTIONS */

UserSchema.methods.addRelation = async function (name: string) {
  if (!name) throw Error('name required')
  if (this.hasFriend(name)) return

  let user = await User.getByName(name)
  if (!user) throw Error(`user doesn't exist`)

  if (!this.hasSubscriber(name)) {
    return user.addSubscriber(this.profile.username)
  }

  await user.addFriend(this.profile.username)
  await this.deleteSubscriber(name)

  return this.addFriend(user.profile.username)
}

UserSchema.methods.brokeRelation = async function (name: string) {
  if (!name) throw Error('name required')
  if (!this.hasFriend(name)) return

  let user = await User.getByName(name)
  if (!user?.hasFriend(this.profile.username)) return

  await this.deleteFriend(name)
  await user.deleteFriend(this.profile.username)

  return this.addSubscriber(name)
}

export const User = model<IUser, UserModel>('User', UserSchema)
