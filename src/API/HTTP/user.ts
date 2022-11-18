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
import { StandOff_Lobbies } from '../Sockets/Controllers/dark-side/lobby'
import { Mail, SMTP } from '../../Utils/smtp'
import { generatePassword } from '../../Utils/passwordGenerator'
require('dotenv').config()

let router = Router()

router.put(
  '/',
  validateToken,
  async (req: Request, res: Response, next: NextFunction) => {
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

      res.status(201).json({ token: token })
    } catch (e) {
      next(e)
    }
  },
)

router.post('/login', async (req, res, next) => {
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

    res.status(201).json({ token: token })
  } catch (e) {
    next(e)
  }
})

router.post('/registration', async (req, res, next) => {
  try {
    let { username, password, id, nickname, email, region } = req.body
    let user = new UserModel({
      id,
      profile: { username, nickname },
      credentials: { email, region },
    })

    validatePasswordFormat(password)
    user.setPassword(password)

    await user.validate()
    await user.save()

    let payload = { username, nickname, email, region, role: user.role }
    let token = generateToken(payload)
    res.status(201).json({ token: token })
  } catch (e) {
    next(e)
  }
})

router.put('/recover', async (req, res, next) => {
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
    res.status(200)
  } catch (e) {
    next(e)
  }
})

/**
 * Путь для загрузки изображения результатов матча
 * Входящие параметры:
 * token - jwt
 * post - match_id
 * match.[pnp/jpeg]
 * @category_match
 * @event
 */
router.post('/end_match', validateToken, async (req, res, next) => {
  try {
    let username = req.body.payload.username as string
    let user = await UserModel.findByName(username)
    if (!user || user.role != 'admin')
      throw new TechnicalError('user', TechnicalCause.INVALID)

    if (!req.files) throw new TechnicalError('image', TechnicalCause.REQUIRED)
    let image = req.files[Object.keys(req.files)[0]]
    if (!image) throw new TechnicalError('image', TechnicalCause.REQUIRED)
    if (typeof image != 'string')
      throw new TechnicalError('image', TechnicalCause.INVALID_FORMAT)

    let { match_id } = req.body
    if (!match_id || typeof match_id != 'string')
      throw new TechnicalError('match_id', TechnicalCause.REQUIRED)

    let lobby = StandOff_Lobbies.get(match_id)
    if (!lobby) throw new TechnicalError('match', TechnicalCause.NOT_EXIST)

    let matchData = await MatchListModel.findOne({ id: match_id })
    if (!matchData) throw new TechnicalError('match_id', TechnicalCause.INVALID)

    matchData.setScreen(image)
    matchData.save()

    let promises = []
    for (let matchMember of matchData.members) {
      let user = await UserModel.findByName(matchMember.name)
      if (!user) throw new TechnicalError(`user`, TechnicalCause.NOT_EXIST)

      let result: Match.Result = Match.Result.DRAW

      let flags = {
        isDraw: matchData.score.command1 == matchData.score.command2,
        isFirstCommandWinner:
          matchData.score.command1 > matchData.score.command2,
      }

      if (!flags.isDraw) {
        if (flags.isFirstCommandWinner && matchMember.command == 'command1')
          result = Match.Result.WIN
        else result = Match.Result.DRAW
      }

      promises.push(user.rating.integrate(matchMember.statistic, result))
    }

    res.sendStatus(200)
    await Promise.all(promises)
    await lobby.stop()
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

    res.status(200).json({ user: user })
  } catch (e) {
    next(e)
  }
})

module.exports = router
