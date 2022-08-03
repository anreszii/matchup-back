import { Router, NextFunction, Request, Response } from 'express'
import { Error as MongoError } from 'mongoose'
import { MongoServerError } from 'mongodb'
import { ValidationError } from '../../error'

let router = Router()

router.use('/api/user', require('./user'))

router.use(function (
  errorObject: ValidationError | MongoError.ValidationError | MongoServerError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let errors: Array<string> = []

  if (errorObject instanceof ValidationError) {
    errors.push(errorObject.genericMessage)
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
