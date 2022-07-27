import { Router, NextFunction, Request, Response } from 'express'
import { validateToken, generateToken } from '../../token/index'
import { ValidationError, validationCause as cause } from '../../error'

import { User } from '../../models/User'
import { generatePassword } from '../../utils/passwordGenerator'
import { SMTP, Mail } from '../../utils/smtp'

let router = Router()

router.put('/', validateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { username: newName, email, region, device, password, nickname, id } = req.body.user
    let username = req.body.payload.username as string

    let user = await User.getByName(username)
    if (!user) throw new ValidationError('user', cause.NOT_EXIST)

    if (id) user.id = id

    if (email) user.credentials.email = email
    if (region) user.credentials.region = region
    if (device) user.credentials.device = device

    if (nickname) user.profile.nickname = nickname
    if (newName) user.profile.username = newName

    if (password) {
      user.validatePasswordFormat(password)
      user.setPassword(password)
    }

    await user.validate()
    await user.save()

    let token = generateToken({
      username: user.profile.username,
      nickname: user.profile.nickname,
      region: user.credentials.region,
      email: user.credentials.email,
      device: user.credentials.device,
    })

    res.status(201).json({ token: token })
  } catch (e) {
    next(e)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    let { username, password } = req.body.user
    if (!username) throw new ValidationError('username', cause.REQUIRED)
    if (!password) throw new ValidationError('password', cause.REQUIRED)

    let user = await User.findOne({ 'profile.username': username })
    if (!user) throw new ValidationError('user', cause.NOT_EXIST)
    user.validatePassword(password)

    let token = generateToken({
      username: user.profile.username,
      nickname: user.profile.nickname,
      region: user.credentials.region,
      email: user.credentials.email,
      device: user.credentials.device,
    })

    res.status(201).json({ token: token })
  } catch (e) {
    next(e)
  }
})

router.post('/registration', async (req, res, next) => {
  try {
    let { username, password } = req.body.user

    let user = new User()

    user.validatePasswordFormat(password)
    user.setPassword(password)

    let { id, nickname, email, region, device } = req.body.user

    user.id = id
    user.profile.username = username
    user.profile.nickname = nickname
    user.credentials.email = email
    user.credentials.region = region
    user.credentials.device = device

    await user.validate()
    await user.save()

    let token = generateToken(({ username, nickname, region, email, device } = req.body.user))
    res.status(201).json({ token: token })
  } catch (e) {
    next(e)
  }
})

router.put('/recover', async (req, res, next) => {
  try {
    let { email } = req.body.user
    if (!email) throw new ValidationError('email', cause.REQUIRED)

    let user = await User.findOne({ email })
    if (!user) throw new ValidationError('user', cause.NOT_EXIST)

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

module.exports = router
