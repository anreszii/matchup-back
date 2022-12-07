import { Router } from 'express'
import { TechnicalCause, TechnicalError } from '../../error'
import { ImageModel } from '../../Models/Image'
import { validateToken } from '../../Token/index'
const uploader = require('imgbb-uploader')

const router = Router()
router.post('/upload', validateToken, async (req, res, next) => {
  try {
    if (!req.files) throw new TechnicalError('files', TechnicalCause.REQUIRED)
    if (!req.files.image || req.files.image instanceof Array)
      throw new TechnicalError('image', TechnicalCause.INVALID_FORMAT)
    let image = req.files.image
    uploader({
      apiKey: process.env.IMGBB_KEY,
      base64string: image.data.toString('base64'),
      name: `${new Date().toDateString()}-${image.name}`,
    })
      .then(
        (response: {
          thumb: { [key: string]: string }
          delete_url: string
        }) => {
          res.json({ display: response.thumb.url })
        },
      )
      .catch((e: unknown) => {
        next(e)
      })
  } catch (e) {
    next(e)
  }
})

module.exports = router
