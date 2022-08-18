import { ValidationError, validationCause } from '../error'
import validator from 'validator'

export function validatePasswordFormat(password: string) {
  if (!password) throw new ValidationError('password', validationCause.REQUIRED)
  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 0,
      minSymbols: 0,
    })
  )
    throw new ValidationError('password', validationCause.INVALID_FORMAT)
}
