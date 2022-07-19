const router = require('express').Router()

router.use(require('./user'))

router.use(function (err, req, res, next) {
  let errors = []
  if (err.errors || err.name == 'ValidationError') {
    Object.keys(err.errors).reduce(function (_, key) {
      if (err.errors[key].kind.includes('defined')) errors.push(err.errors[key].message)
      else if (err.errors[key].kind.includes('unique')) errors.push(`invalid ${err.errors[key].path}`)
      else errors.push(err.errors[key].message)
    }, {})
  } else {
    if (err.code == 11000) {
      if (err.keyPattern['id']) errors.push('invalid id')
      else if (err.keyPattern['credentials.email']) errors.push('invalid email')
      else if (err.keyPattern['profile.nickname']) errors.push('invalid nickname')
      else if (err.keyPattern['profile.username']) errors.push('invalid username')
    } else {
      errors.push(err.message)
    }
  }
  return next(errors)
})

module.exports = router
