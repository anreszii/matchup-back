const validator = require('validator')
const { hashGenerator: generateHash } = require('../utils')
var { Schema, model } = require('mongoose')

const UserSchema = new Schema({
  id: {
    type: Number,
    required: [true, 'ID required'],
    index: true,
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

UserSchema.methods.validatePasswordFormat = function (password) {
  return validator.default.isStrongPassword(password, {
    minLength: 8,
    minLowerCase: 1,
    minUpperCase: 1,
    minNumbers: 0,
    minSymbols: 0,
  })
}

UserSchema.methods.validatePassword = function (password) {
  return this.password === generateHash(password, this.salt).hash
}

UserSchema.methods.setPassword = function (password) {
  let result = generateHash(password)
  this.password = result.hash
  this.salt = result.salt
}

model('User', UserSchema)
