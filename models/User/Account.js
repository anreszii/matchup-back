const { Schema, model } = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const Task = model('Task')
const BattlePass = require('../Battlepass/Battlepass')
const RewardSchema = require('../Battlepass/Reward')
const rewards = require('../../configs/task_rewards')

const validator = require('validator')
const { generateHash, math } = require('../../utils')

const UserSchema = new Schema({
  id: {
    type: Number,
    required: [true, 'id required'],
    unique: true,
    validate: {
      validator: function (v) {
        return Number(v) == v && v % 1 === 0
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
        validator: function (v) {
          return validator.default.isEmail(v)
        },
        message: (props) => `invalid email format`,
      },
    },

    region: {
      type: String,
      required: [true, 'region required'],
    },

    device: {
      type: String,
      required: [true, 'device required'],
    },
  },

  profile: {
    //Возможно будет лучше разделить на usernick / username
    nickname: {
      type: String,
      required: [true, 'nickname required'],
      unique: true,
      validate: {
        validator: function (v) {
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
        validator: function (v) {
          let length = v.length
          return Boolean(length >= 6 && length <= 18)
        },
        message: (props) => `invalid username format`,
      },
    },

    avatar: String,

    relations: {
      type: Schema({
        friends: [String],
        subscribers: [String],
      }),
      default: {
        friends: [],
        subscribers: [],
      },
    },

    statistic: {
      type: Schema.Types.ObjectId,
      ref: 'Statistic',
    },

    level: {
      type: new Schema({
        nextLevel: new Schema({
          requiredEXP: Number,
          reward: RewardSchema,
        }),
        currentEXP: Number,
      }),
      default: {
        next: {
          requiredEXP: 0,
          reward: undefined,
        },
        currentEXP: 0,
      },
    },
  },

  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
  },

  dailyTasks: {
    type: [{ type: Schema.Types.ObjectId, ref: 'UserTask' }],
  },

  balance: {
    type: Number,
    default: 0,
  },
})

UserSchema.plugin(uniqueValidator)

/* PASSWORD */

UserSchema.methods.validatePasswordFormat = function (password) {
  if (!password) return
  if (
    !validator.default.isStrongPassword(password, {
      minLength: 8,
      minLowerCase: 1,
      minUpperCase: 1,
      minNumbers: 0,
      minSymbols: 0,
    })
  )
    throw Error('invalid password format')
}

UserSchema.methods.validatePassword = function (password) {
  if (!password) throw Error('password required')

  if (this.credentials.password !== generateHash(password, this.credentials.salt).hash) throw Error('invalid password')
}

UserSchema.methods.setPassword = function (password) {
  if (!password) return
  if (this.credentials.password == generateHash(password, this.credentials.salt).hash) return

  let result = generateHash(password)
  this.credentials.password = result.hash
  this.credentials.salt = result.usedSalt
}

/* BATTLEPASS & TASKS */

UserSchema.methods.updateDailyTasks = async function () {
  for (let task of this.dailyTasks) {
    await Task.deleteOne({ _id: task })
  }
  this.dailyTasks = []

  let keys = Array.from(rewards.adaptive.keys())
  let taskName, task, arrayIndex

  for (let i = 0; i < 3; ) {
    arrayIndex = math.minMax(0, keys.length - 1)
    taskName = keys[arrayIndex]

    if (!taskName) continue

    keys[arrayIndex] = undefined

    task = new Task()

    task.createAdaptive(this.profile.username, taskName)
    task.setExpirationTime(1, 'day')

    await task.save()
    this.dailyTasks.push(task._id)
    i++
  }

  task = new Task()
  task.createStatic(this.profile.username, 'completeDaily')
  task.setExpirationTime(1, 'day')

  await task.save()
  this.dailyTasks.push(task._id)

  return this.save()
}

UserSchema.methods.addEXP = async function (amount) {
  let userLevel = this.profile.level

  if (!userLevel.next.requiredEXP) {
    userLevel.nextLevel = BattlePass.getCurrentLevel(0)
    await this.save()

    return this.addEXP(amount)
  }

  userLevel.currentEXP += amount
  if (userLevel.currentEXP >= userLevel.nextLevel.requiredEXP) {
    this.balance += userLevel.nextLevel.reward.amount
    userLevel.nextLevel = BattlePass.getCurrentLevel(userLevel.currentEXP)
  }

  return this.save()
}

UserSchema.methods.addMP = async function (amount) {
  this.balance += amount
  return this.save()
}

/* RELATIONS */

/* SUBSCRIBERS */
UserSchema.methods.getSubscriberList = function () {
  return this.profile.relations.subscribers
}

UserSchema.methods.hasSubscriber = function (name) {
  return this.profile.relations.subscribers.includes(name)
}

UserSchema.methods.addSubscriber = async function (name) {
  if (this.hasSubscriber(name)) return

  this.profile.relations.subscribers.push(name)

  return this.save()
}

UserSchema.methods.deleteSubscriber = async function (name) {
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

UserSchema.methods.hasFriend = function (name) {
  return this.profile.relations.friends.includes(name)
}

UserSchema.methods.addFriend = async function (name) {
  if (this.hasFriend(name)) return

  this.profile.relations.friends.push(name)

  return this.save()
}

UserSchema.methods.deleteFriend = async function (name) {
  if (!this.hasFriend(name)) return
  let friends = this.profile.relations.friends

  let friendIndex = friends.indexOf(name)

  if (~friendIndex) {
    friends.splice(friendIndex, 1)
    return this.save()
  }
}

/* RELATION ACTIONS */

UserSchema.methods.addRelation = async function (name) {
  if (!name) throw Error('name required')
  if (this.hasFriend(name)) return

  let User = model('User')
  let user = await User.findOne({ 'profile.username': name })
  if (!user) throw Error(`user doesn't exist`)

  if (!this.hasSubscriber(name)) {
    return user.addSubscriber(this.profile.username)
  }

  await user.addFriend(this.profile.username)
  await this.deleteSubscriber(name)

  return this.addFriend(user.profile.username)
}

UserSchema.methods.brokeRelation = async function (name) {
  if (!name) throw Error('name required')
  if (!this.hasFriend(name)) return

  let User = model('User')
  let user = await User.findOne({ 'profile.username': name })
  if (!user.hasFriend(this.profile.username)) return

  await this.deleteFriend(name)
  await user.deleteFriend(this.profile.username)

  return this.addSubscriber(name)
}

model('User', UserSchema)
