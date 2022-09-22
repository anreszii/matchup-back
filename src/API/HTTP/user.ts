import { Router, NextFunction, Request, Response } from 'express'
import { validateToken, generateToken } from '../../Token'
import { ValidationError, validationCause as cause } from '../../error'

import { UserModel } from '../../Models'
import { SMTP, Mail, generatePassword } from '../../Utils'
import { validatePasswordFormat } from '../../validation'

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
      if (!user) throw new ValidationError('user', cause.NOT_EXIST)

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
    if (!username) throw new ValidationError('username', cause.REQUIRED)
    if (!password) throw new ValidationError('password', cause.REQUIRED)

    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', cause.NOT_EXIST)
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
    if (!email) throw new ValidationError('email', cause.REQUIRED)

    let user = await UserModel.findByEmail(email)
    if (!user) throw new ValidationError('user', cause.NOT_EXIST)

    let newPassword = generatePassword()
    user.setPassword(newPassword)

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

module.exports = router
