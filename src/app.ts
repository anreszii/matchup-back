import type { Response } from 'express'
require('dotenv').config()

import io from 'gamesocket.io'
export const WS_SERVER = io({
  key_file_name: `${__dirname}/privkey.pem`,
  cert_file_name: `${__dirname}/fullchain.pem`,
})

import express = require('express')
import fileUploader = require('express-fileupload')
const cors = require('cors')
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}

const app = express()
app.use(cors(corsOptions))
app.use(fileUploader())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

import { DiscordClient } from './Classes/Discord/Client'
export const DISCORD_ROBOT = new DiscordClient(process.env.DISCORD_BOT_TOKEN!)

import mongoose from 'mongoose'
import { Logger } from './Utils/Logger'
const mongoLogger = new Logger('mongodb')
mongoose.connect(
  `mongodb+srv://Perception:${process.env.MONGO_PASS}@testcluster.vbwobca.mongodb.net/?retryWrites=true&w=majority`,
  (error) => {
    if (error)
      return mongoLogger.fatal(
        `[ERROR ${error.name}]: ${error.message}; STACK: ${error.stack}`,
      )
    console.log('Connected to database')
  },
)
require('./Models')
require('./API/Sockets')
require('./API/Discord')
app.use(require('./API/HTTP'))

app.use(function (_: any, _1: any, next: any) {
  var err = new Error('Not Found')
  next(err)
})

app.use(function (err: Error, _: any, res: Response, _1: any) {
  res.json({ errors: err })
})

const fs = require('fs')
const privateKey = fs.readFileSync(`${__dirname}/privkey.pem`)
const certificate = fs.readFileSync(`${__dirname}/fullchain.pem`)
require('https')
  .createServer({ key: privateKey, cert: certificate }, app)
  .listen(Number(process.env.HTTP_PORT), () => {
    console.log(`Example app listening on port ${process.env.HTTP_PORT}`)
  })

WS_SERVER.listen(Number(process.env.WEB_SOCKET_PORT!), (ls: unknown) => {
  if (ls)
    console.log(`listening websockets on port ${process.env.WEB_SOCKET_PORT}`)
})
