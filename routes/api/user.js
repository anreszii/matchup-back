let router = require('express').Router()
let generateToken = require('../token/gen')

router.post('/user/login', (req, res) => {
  res.status(201).json(generateToken(req.body.user.name))
})

router.post('/user/register', (req, res) => {
  res.status(201).json(generateToken(req.body.user.name))
})

module.exports = router
