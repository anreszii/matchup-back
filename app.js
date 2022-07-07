const express = require('express')

const fileUploader = require('express-fileupload')

const app = express()

app.use(fileUploader())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(require('./routes'))
