import express, { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import fileUploader from 'express-fileupload'

import * as Models from './Models/index.js'
import { router } from './API/HTTP/index.js'
import { app as WsApp } from './API/index.js'

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

app.use(router)

app.use(function (_, _1, next) {
  var err = new Error('Not Found')
  next(err)
})

app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  res.json({ errors: err })
})

WsApp.listen(Number(process.env.PORT), (ls: unknown) => {
  if (ls) console.log(`listening websockets on ${process.env.PORT}`)
})

app.listen(Number(process.env.PORT), () => {
  console.log(`Example app listening on port 3000`)
})
