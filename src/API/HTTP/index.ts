import { Router, NextFunction } from 'express'
import { Error as MongoError } from 'mongoose'
import { MongoServerError } from 'mongodb'
import { isMatchUpError, MatchUpError } from '../../error'

import { Logger } from '../../Utils/Logger'
const logger = new Logger('HTTP', 'index')

let router = Router()

router.use('/api/user', require('./user'))
router.use('/api/vk', require('./vk'))
router.use('/api/image', require('./image'))
router.use('/api/results', require('./match_result'))

router.use(function (
  errorObject: MatchUpError | MongoError.ValidationError | MongoServerError,
  _: unknown,
  _1: unknown,
  next: NextFunction,
) {
  logger.warning(
    `[ERROR ${errorObject.name}]: ${errorObject.message}; STACK: ${errorObject.stack}`,
  )
  let errors: Array<string> = []

  if (isMatchUpError(errorObject)) {
    errors.push(errorObject.DTO.to.JSON)
    return next(errors)
  }

  if (errorObject instanceof MongoError.ValidationError) {
    for (let key of Object.keys(errorObject.errors)) {
      let error = errorObject.errors[key]
      if (error.name == 'ValidatorError') {
        if (error.kind.includes('defined'))
          errors.push(error.properties.message)
        else if (error.kind.includes('unique'))
          errors.push(`invalid ${error.path}`)
        else errors.push(error.properties.message)
      } else errors.push('Database cast error')
    }

    return next(errors)
  }

  if (errorObject.keyPattern['id']) errors.push('invalid id')
  else if (errorObject.keyPattern['credentials.email'])
    errors.push('invalid email')
  else if (errorObject.keyPattern['profile.nickname'])
    errors.push('invalid nickname')
  else if (errorObject.keyPattern['profile.username'])
    errors.push('invalid username')

  return next(errors)
})

module.exports = router
