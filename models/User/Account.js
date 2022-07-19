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

    statistic: {
      type: Schema.Types.ObjectId,
      ref: 'Statistic',
    },
  },

  friends: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },

  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
  },

  dailyTasks: {
    type: [{ type: Schema.Types.ObjectId, ref: 'UserTask' }],
  },

  level: {
    type: new Schema({
      next: new Schema({
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

  balance: {
    type: Number,
    default: 0,
  },
})

UserSchema.plugin(uniqueValidator)

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

/**
 * Does nothing if password is correct
 *
 * @param {String} password
 */
UserSchema.methods.validatePassword = function (password) {
  if (!password) throw Error('password required')

  if (this.credentials.password !== generateHash(password, this.credentials.salt).hash)
    throw Error('incorrect password')
}

/**
 * Generate hash with random salt from given string
 *
 * @param {String} password
 */
UserSchema.methods.setPassword = function (password) {
  if (!password) return
  if (this.credentials.password == generateHash(password, this.credentials.salt).hash) return

  let result = generateHash(password)
  this.credentials.password = result.hash
  this.credentials.salt = result.usedSalt
}

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
  if (!this.level.next.requiredEXP) {
    this.level.next = BattlePass.getCurrentLevel(0)
    await this.save()

    this.addEXP(amount)
  }

  this.level.currentEXP += amount
  if (this.level.currentEXP >= this.level.next.requiredEXP) {
    this.balance += this.level.next.reward.amount
    this.level.next = BattlePass.getCurrentLevel(this.level.currentEXP)
  }

  await this.save()
}

UserSchema.methods.addMP = async function (amount) {
  this.balance += amount

  await this.save()
}

model('User', UserSchema)
