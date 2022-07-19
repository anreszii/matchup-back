const router = require('express').Router()
const mongoose = require('mongoose')
const utils = require('../../utils')

const generateToken = require('../token/generate')
const validateToken = require('../token/authenticate')

let BattlePass = require('../../models/Battlepass/Battlepass')
let User = mongoose.model('User')
let Task = mongoose.model('Task')

router.post('/user', validateToken, async (req, res, next) => {
  try {
    let { update, numer, count } = req.body.control
    let { username } = req.payload

    let user = await User.findOne({ 'profile.username': username })
    if (update) await user.updateDailyTasks()
    let task = await Task.findById(user.dailyTasks[numer])

    let reward = await task.addProgress(count)

    if (reward) {
      await user.addMP(reward.adaptive.amount)
      if (reward.static) await user.addMP(reward.static.amount)
    }

    await BattlePass.init()
    await user.addEXP(100)

    res.status(200).json({ balance: user.balance, tasks: await Task.find({ owner: user.profile.username }) })
  } catch (e) {
    next(e)
  }
})

router.put('/user', validateToken, async (req, res, next) => {
  try {
    let { username: newName, email, region, device, password, nickname, id } = req.body.user
    let username = req.payload.username

    let user = await User.findOne({ 'profile.username': username })
    if (!user) throw Error(`user doesn't exist`)

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

router.post('/user/login', async (req, res, next) => {
  try {
    let { username, password } = req.body.user
    if (!username) throw Error('username required')
    if (!password) throw Error('password required')

    let user = await User.findOne({ 'profile.username': username })
    if (!user) throw Error(`user doesn't exist`)
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

router.post('/user/register', async (req, res, next) => {
  try {
    let { username, password } = req.body.user

    user = new User()

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

router.put('/user/recover', async (req, res, next) => {
  try {
    let { email } = req.body.user
    if (!email) throw Error('email required')

    let user = await User.findOne({ email })
    if (!user) throw Error(`user doesn't exist`)

    let newPassword = utils.generatePassword()
    user.setPassword(newPassword)
    await user.save()

    let mail = new utils.smtp.Mail().to(email).subject('Восстановление пароля').text(`
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
    utils.smtp.Mailer.send(mail)
    res.status(200)
  } catch (e) {
    next(e)
  }
})

module.exports = router
