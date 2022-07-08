const router = require('express').Router()
const mongoose = require('mongoose')
const utils = require('../../utils')

const generateToken = require('../token/generate')
const validateToken = require('../token/authenticate')

let User = mongoose.model('User')

router.post('/user/login', async (req, res, next) => {
  try {
    let { username, password } = req.body.user
    if (!username || !password) throw Error('password and username required')

    let user = await User.findOne({ username })
    if (!user) throw Error(`User with name ${username} doesn't exist`)
    user.validatePassword(password)

    let token = generateToken({
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      region: user.region,
      device: user.device,
    })

    res.status(201).json(token)
  } catch (e) {
    next(e)
  }
})

router.post('/user/register', async (req, res, next) => {
  try {
    let { username, password } = req.body.user

    if (username == undefined) throw Error('Username required')
    if (password == undefined) throw Error('Password required')

    let user = await User.findOne({ username })
    if (user) throw Error(`User with name ${username} already exist`)

    user = new User()

    user.validatePasswordFormat(password)
    user.setPassword(password)

    let { id, nickname, email, region, device } = req.body.user

    user.id = id
    user.username = username
    user.nickname = nickname
    user.email = email
    user.region = region
    user.device = device

    await user.validate()
    await user.save()

    let token = generateToken(({ username, nickname, region, email, device } = req.body.user))
    res.status(201).json(token)
  } catch (e) {
    next(e)
  }
})

router.put('/user', validateToken, async (req, res, next) => {
  try {
    let { email, username, region, device, password } = req.body.user

    if (!username) throw Error('Username required')

    let user = await User.findOneAndUpdate({ username }, { email, region, device })
    if (!user) throw Error(`User doesn't exist`)

    if (password) {
      user.validatePasswordFormat(password)
      user.setPassword(password)
    }

    await user.save()
    res.status(201).send('OK')
  } catch (e) {
    next(e)
  }
})

router.put('/user/recover', async (req, res, next) => {
  try {
    let { email } = req.body.user
    if (!email) throw Error('email required')

    let user = await User.findOne({ email })
    if (!user) throw Error(`user doesn't exist`)

    let newPassword = utils.generatePassword()
    user.setPassword(newPassword)
    await user.save()

    if (email) {
      let mail = new utils.smtp.Mail()
        .to(email)
        .subject('Восстановление пароля')
        .text(`Новый временный пароль: ${newPassword}`)
      utils.smtp.Mailer.send(mail)
    }
  } catch (e) {
    next(e)
  }
})

module.exports = router
