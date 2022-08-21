import type { Response } from 'express'
import express = require('express')
import fileUploader = require('express-fileupload')

import mongoose from 'mongoose'
import { app as WsApp } from './API'
require('dotenv').config()

const app = express()
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
app.use(require('./API/HTTP'))

app.use(function (_: any, _1: any, next: any) {
  var err = new Error('Not Found')
  next(err)
})

app.use(function (err: Error, _: any, res: Response, _1: any) {
  res.json({ errors: err })
})

WsApp.listen(Number(process.env.WEB_SOCKET_PORT!), (ls: unknown) => {
  if (ls)
    console.log(`listening websockets on port ${process.env.WEB_SOCKET_PORT}`)
})

app.listen(Number(process.env.HTTP_PORT!), () => {
  console.log(`Example app listening on port 3000`)
})

export * from './Classes'
export * from './Utils'
export * from './validation'
export * from './Interfaces'
