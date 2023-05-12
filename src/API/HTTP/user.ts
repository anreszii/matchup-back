import { Router, NextFunction, Request, Response } from 'express'
import { validateToken, generateToken } from '../../Token'

import { MatchListModel, UserModel } from '../../Models'

import { Match, USER_ROLE } from '../../Interfaces/index'
import {
  ServerCause,
  ServerError,
  TechnicalCause,
  TechnicalError,
} from '../../error'
import { validatePasswordFormat } from '../../validation/password'
import { Mail, SMTP } from '../../Utils/smtp'
import { generatePassword } from '../../Utils/passwordGenerator'
import { DTO } from '../../Classes/DTO/DTO'
import { Logger } from '../../Utils/Logger'
import { StandOff_Lobbies } from '../../Classes/MatchMaking/Lobby/Manager'
require('dotenv').config()

let router = Router()

router.put(
  '/',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const logger = new Logger('HTTP', 'user')
    logger.trace(
      `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
        req.params,
      )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
        req.files == undefined
      }`,
    )
    try {
      let {
        username: newName,
        email,
        region,
        password,
        nickname,
        id,
      } = req.body
      let username = req.body.payload.username as string

      let user = await UserModel.findByName(username)
      if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

      if (id) user.id = id

      if (email) user.credentials.email = email
      if (region) user.credentials.region = region

      if (nickname) user.profile.nickname = nickname
      if (newName) user.profile.username = newName

      if (password) {
        validatePasswordFormat(password)
        user.setPassword(password)
      }

      await user.validate()
      await user.save()

      let token = generateToken({
        username: user.profile.username,
        nickname: user.profile.nickname,
        region: user.credentials.region,
        email: user.credentials.email,
        role: user.role,
      })

      logger.trace(`SERVER RESPONSE: ${JSON.stringify({ token: token })}`)
      res.status(201).json({ token: token })
    } catch (e) {
      next(e)
    }
  },
)

router.post('/login', async (req, res, next) => {
  const logger = new Logger('HTTP', 'user/login')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    let { username, password } = req.body
    if (!username) throw new TechnicalError('username', TechnicalCause.REQUIRED)
    if (!password) throw new TechnicalError('password', TechnicalCause.REQUIRED)

    let user = await UserModel.findByName(username)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    user.validatePassword(password)

    let token = generateToken({
      username: user.profile.username,
      nickname: user.profile.nickname,
      region: user.credentials.region,
      email: user.credentials.email,
      role: user.role,
    })

    logger.trace(`SERVER RESPONSE: ${JSON.stringify({ token: token })}`)
    res.status(201).json({ token: token })
  } catch (e) {
    next(e)
  }
})

router.post('/registration', async (req, res, next) => {
  const logger = new Logger('HTTP', 'user/registration')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    let { username, password, id, nickname, email, region, discord } = req.body
    let user = new UserModel({
      id,
      profile: { username, nickname, discord_nickname: discord },
      credentials: { email, region },
    })

    validatePasswordFormat(password)
    user.setPassword(password)

    await user.validate()
    await user.save()

    let payload = { username, nickname, email, region, role: user.role }
    let token = generateToken(payload)
    logger.trace(`SERVER RESPONSE: ${JSON.stringify({ token: token })}`)
    res.status(201).json({ token: token })
  } catch (e) {
    next(e)
  }
})

router.put('/recover', async (req, res, next) => {
  const logger = new Logger('HTTP', 'user/recover')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    let { email } = req.body
    if (!email) throw new TechnicalError('email', TechnicalCause.REQUIRED)

    let user = await UserModel.findByEmail(email)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    let newPassword = generatePassword()
    user.setPassword(newPassword)
    await user.save()

    let mail = new Mail()
    mail.to(email)
    mail.subject('Восстановление пароля')
    mail.text(`
        Имя пользователя: ${user.profile.username}
        Новый временный пароль: ${newPassword}
        Для безопасности, пожалуйста, измените временный пароль на свой.
        
        Для этого: 
          - авторизируйтесь с временным паролем
          - зайдите в профиль
          - нажмите на иконку рядом с полем 'Пароль' 
          - задайте новый пароль и сохраните его.
        С уважением, команда MatchUp
      `)

    SMTP.send(mail)
    logger.trace(`SERVER RESPONSE: [200]`)
    res.status(200).end()
  } catch (e) {
    next(e)
  }
})

/**
 * Путь для пополнения баланса
 * Входные параметры:
 * pass: string
 * name: string
 * mp: number
 * @category_match
 * @event
 */
router.post('/add_mp', async (req, res, next) => {
  const logger = new Logger('HTTP', 'user/add_mp')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    let { name, mp, pass } = req.body
    if (pass != process.env.ROUTE_PASS)
      throw new ServerError(ServerCause.INVALID_ROUTE)

    if (!name || typeof name != 'string')
      throw new TechnicalError('name', TechnicalCause.INVALID_FORMAT)
    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    if (!mp || typeof mp != 'number' || mp < 0)
      throw new TechnicalError('mp', TechnicalCause.INVALID_FORMAT)
    user.addMP(mp)
    await user.save()

    logger.trace(
      `SERVER RESPONSE: ${JSON.stringify({ balance: user.profile.balance })}`,
    )
    res.status(200).json({ balance: user.profile.balance })
  } catch (e) {
    next(e)
  }
})

/**
 * Путь для смены статуса пользователя
 * Входные параметры:
 * pass: string
 * name: string
 * status: 'default' | 'privileged' | 'admin'
 * @category_match
 * @event
 */
router.post('/set_status', async (req, res, next) => {
  const logger = new Logger('HTTP', 'user/set_status')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    let { status, pass, name } = req.body.status
    if (pass != process.env.ROUTE_PASS)
      throw new ServerError(ServerCause.INVALID_ROUTE)
    if (!name || typeof name != 'string')
      throw new TechnicalError('name', TechnicalCause.INVALID_FORMAT)
    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    if (!status || typeof status != 'string')
      throw new TechnicalError('status', TechnicalCause.INVALID_FORMAT)
    user.role = status as USER_ROLE
    await user.save()

    logger.trace(`SERVER RESPONSE: ${JSON.stringify({ user: user })}`)
    res.status(200).json({ user: user })
  } catch (e) {
    next(e)
  }
})

/**
 * name: имя кому надо увеличить прем
 * period: количество месяцев према
 */
router.post('/extend_premium', async (req, res, next) => {
  const logger = new Logger('HTTP', 'user/extend_premium')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    let { name, period: periodInMonth, pass } = req.body
    if (!name || typeof name != 'string')
      throw new TechnicalError('name', TechnicalCause.INVALID_FORMAT)
    if (!periodInMonth || typeof periodInMonth != 'number' || periodInMonth < 0)
      throw new TechnicalError('period', TechnicalCause.INVALID_FORMAT)
    UserModel.findByName(name)
      .then(async (user) => {
        if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
        await user.extend_premium(periodInMonth)
        const dto = new DTO({ status: 'success' })
        logger.trace(`SERVER RESPONSE: ${dto.to.JSON}`)
        res.status(200).json(dto.to.JSON)
      })
      .catch((e) => {
        next(e)
      })
  } catch (e) {
    next(e)
  }
})

/**
 * :name - имя пользователя
 */
router.get('/premium/:name', async (req, res, next) => {
  const logger = new Logger('HTTP', 'user/premium/')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    let name = req.params.name
    if (!name || typeof name != 'string')
      throw new TechnicalError('name', TechnicalCause.INVALID_FORMAT)
    UserModel.findByName(name)
      .then(async (user) => {
        if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
        await user.is_premium()
        logger.trace(`SERVER RESPONSE: ${user.premium}`)
        res.status(200).json(user.premium)
      })
      .catch((e) => {
        next(e)
      })
  } catch (e) {
    next(e)
  }
})

module.exports = router
