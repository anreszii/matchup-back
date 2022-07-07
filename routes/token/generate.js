const jwt = require('jsonwebtoken')
const { JWT_SECRET, JWT_OPTIONS } = require('../../configs/jwt_token')

module.exports = (data) =>
  jwt.sign(
    {
      data,
    },
    JWT_SECRET,
    JWT_OPTIONS,
  )
