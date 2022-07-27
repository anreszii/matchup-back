import express, { Express, NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import fileUploader from 'express-fileupload'

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

require('./models')

app.use(require('./api/http'))

app.use(function (_, _1, next) {
  var err = new Error('Not Found')
  next(err)
})

app.use(function (err: Error, req: Request, res: Response, next: NextFunction) {
  res.json({ errors: err })
})

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`)
})
