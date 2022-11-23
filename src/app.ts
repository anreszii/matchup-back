import type { Response } from 'express'
require('dotenv').config()

import io from 'gamesocket.io'

import express = require('express')
import fileUploader = require('express-fileupload')
const cors = require('cors')
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}

import mongoose from 'mongoose'
import { DiscordClient } from './Classes/Discord/Client'

export const WS_SERVER = io()
export const DISCORD_ROBOT = new DiscordClient(process.env.DISCORD_BOT_TOKEN!)

const app = express()
app.use(cors(corsOptions))
app.use(fileUploader())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

mongoose.connect(
  'mongodb+srv://Perception:eWvXO4EXlwTQ2Dpx@testcluster.vbwobca.mongodb.net/?retryWrites=true&w=majority',
  (error) => {
    if (error) return console.log(error)

    console.log('Connected to database')
  },
)
require('./Models')
require('./API/Sockets')
app.use(require('./API/HTTP'))

app.use(function (_: any, _1: any, next: any) {
  var err = new Error('Not Found')
  next(err)
})

app.use(function (err: Error, _: any, res: Response, _1: any) {
  res.json({ errors: err })
})

WS_SERVER.listen(Number(process.env.WEB_SOCKET_PORT!), (ls: unknown) => {
  if (ls)
    console.log(`listening websockets on port ${process.env.WEB_SOCKET_PORT}`)
})

app.listen(Number(process.env.HTTP_PORT!), () => {
  console.log(`Example app listening on port ${process.env.HTTP_PORT}`)
})
