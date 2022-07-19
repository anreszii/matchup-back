const express = require('express')
const fileUploader = require('express-fileupload')

const mongoose = require('mongoose')
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

app.use(require('./routes'))

app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

app.use(function (err, req, res, next) {
  res.json({ errors: err })
})

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`)
})
