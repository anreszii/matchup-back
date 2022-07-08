const jwt = require('jsonwebtoken')
const { JWT_SECRET, JWT_OPTIONS } = require('../../configs/jwt_token')

module.exports = (payload) => jwt.sign(payload, JWT_SECRET, JWT_OPTIONS)
