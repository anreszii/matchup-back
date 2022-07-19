const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../../configs/jwt_token')

module.exports = function (req, res, next) {
  let token = getTokenFromRequest(req)
  if (!token) next(Error('token required'))

  try {
    let dataFromToken = jwt.verify(token, JWT_SECRET)
    req.payload = dataFromToken
  } catch (e) {
    next(Error('invalid token'))
  }

  return next()
}

function getTokenFromRequest(req) {
  if (hasToken(req)) {
    return req.headers.authorization.split(' ')[1]
  }
  return null
}

function hasToken(req) {
  if (
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token')
  )
    return true

  return false
}
