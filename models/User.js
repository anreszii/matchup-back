var { Schema, model } = require('mongoose')
var uniqueValidator = require('mongoose-unique-validator')

var validator = require('validator')
var { generateHash } = require('../utils')

const UserSchema = new Schema({
  id: {
    type: Number,
    required: [true, 'ID required'],
    unique: true,
    validate: {
      validator: function (v) {
        return Number(v) == v && v % 1 === 0
      },
      message: (props) => `${props.value} is not integer`,
    },
  },

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
      message: (props) => `nickname must have from 6 to 18 characters`,
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
      message: (props) => `username must have from 6 to 18 characters`,
    },
  },

  password: {
    type: String,
    required: [true, 'password required'],
  },

  salt: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: [true, 'email required'],
    uniqueCaseInsensitive: true,
    validate: {
      validator: function (v) {
        return validator.default.isEmail(v)
      },
      message: (props) => `wrong email format`,
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
})

UserSchema.plugin(uniqueValidator)

UserSchema.methods.validatePasswordFormat = function (password) {
  if (
    !validator.default.isStrongPassword(password, {
      minLength: 8,
      minLowerCase: 1,
      minUpperCase: 1,
      minNumbers: 0,
      minSymbols: 0,
    })
  )
    throw Error('Invalid password format')
}

UserSchema.methods.validatePassword = function (password) {
  if (this.password !== generateHash(password, this.salt).hash) throw Error('Invalid password')
}

UserSchema.methods.setPassword = function (password) {
  let result = generateHash(password)
  this.password = result.hash
  this.salt = result.salt
}

model('User', UserSchema)
