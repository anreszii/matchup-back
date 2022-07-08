const router = require('express').Router()
const mongoose = require('mongoose')

const generateToken = require('../token/generate')

let User = mongoose.model('User')

router.post('/user/login', async (req, res, next) => {
  try {
    let { username, password } = req.body.user
    if (!username || !password) throw Error('password and username required')

    let user = await User.findOne({ username: username })
    if (!user) throw Error(`User with name ${username} doesn't exist`)
    if (!user.validatePassword(password)) throw Error('Wrong password')

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
    if (password == undefined) throw Error('Username required')

    let user = await User.findOne({ username: username })
    if (user == undefined) throw Error(`User with name ${username} already exist`)
    user = new User()

    if (user.validatePasswordFormat(password)) user.setPassword(password)
    else throw Error('Invalid password structure')

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

module.exports = router
