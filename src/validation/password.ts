import validator from 'validator'
import { TechnicalCause, TechnicalError } from '../error'

export function validatePasswordFormat(password: string) {
  if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)
  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 0,
      minSymbols: 0,
    })
  )
    throw new TechnicalError('password', TechnicalCause.INVALID_FORMAT)
}
