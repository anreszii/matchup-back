import { Router, NextFunction, Request, Response } from 'express'

const v = '5.131'
const access_token =
  'a5f497d4a5f497d4a5f497d445a6e5f615aa5f4a5f497d4c69eacdf6c6d207cc4f3dc2b'
const owner_id = '-147812948'
const count = 3

const router = Router()
router.get('/', (req, res, next) => {
  fetch(
    `https://api.vk.com/method/wall.get?v=${v}&access_token=${access_token}&owner_id=${owner_id}&count=${count}`,
  ).then(async (response) => {
    if (!response.ok) return res.status(response.status)
    res.status(200).json(await response.json())
  })
})

module.exports = router
