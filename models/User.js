var mongoose = require('mongoose')
var secret = require('../config').secret

/**
 * @TODO
 * - [] сделать валидацию
 */

const UserSchema = new Schema({
  id: { type: Number, required: true, index: true, unique: true },

  //Возможно будет лучше разделить на usernick / username
  nickname: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return true
      },
      message: (props) => 'is not valid',
    },
  },

  username: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return true
      },
      message: (props) => 'is not valid',
    },
  },

  password: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return true
      },
      message: (props) => 'is not valid',
    },
  },

  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return true
      },
      message: (props) => 'is not valid',
    },
  },

  region: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return true
      },
      message: (props) => 'is not valid',
    },
  },

  device: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return true
      },
      message: (props) => 'is not valid',
    },
  },
})

mongoose.model('User', UserSchema)
