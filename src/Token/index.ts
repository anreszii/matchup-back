import type { IDataEscort } from 'gamesocket.io/lib/DataManager/DataEscort/DataEscort.js'

import jwt from 'jsonwebtoken'
import { NextFunction, Request } from 'express'
import { JWT_SECRET, JWT_OPTIONS } from '../configs/jwt_token.js'
import { validationCause, ValidationError } from '../error.js'

export function validateToken(req: Request, _: unknown, next: NextFunction) {
  let token = getTokenFromRequest(req)
  if (!token) next(new ValidationError('token', validationCause.REQUIRED))

  try {
    let dataFromToken = jwt.verify(token as string, JWT_SECRET)
    req.body.payload = dataFromToken
    return next()
  } catch (e) {
    next(new ValidationError('token', validationCause.INVALID))
  }
}

/**
 *  Функция валидации JWT-токена для работы с библиотекой gamesocket.io
 *
 * @param escort
 * @returns расшированный токен, находящийся в поле 'token' JSON-пакета или ошибку валидации
 */
export function validatePacket(escort: IDataEscort) {
  let token = escort.get('token')
  if (typeof token != 'string')
    throw new ValidationError('token', validationCause.REQUIRED)

  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
}

function getTokenFromRequest(req: Request) {
  if (hasToken(req)) {
    return req.headers.authorization!.split(' ')[1]
  }
  return null
}

function hasToken(req: Request) {
  if (
    (req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Bearer') ||
    (req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Token')
  )
    return true

  return false
}

export function generateToken(payload: Object) {
  return jwt.sign(payload, JWT_SECRET, JWT_OPTIONS)
}
