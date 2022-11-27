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
        async (response: {
          thumb: { [key: string]: string }
          delete_url: string
        }) => {
          let document = await ImageModel.create({
            display_url: response.thumb.url as string,
            delete_url: response.delete_url as string,
          })
          res.send(document._id)
        },
      )
      .catch((e: unknown) => {
        next(e)
      })
  } catch (e) {
    next(e)
  }
})

router.get('/:id', validateToken, async (req, res, next) => {
  try {
    let id = req.params.id
    if (!id) throw new TechnicalError('id', TechnicalCause.REQUIRED)

    let image = await ImageModel.findById(id)
    if (!image) throw new TechnicalError('image', TechnicalCause.NOT_EXIST)
    res.send(image)
  } catch (e) {
    next(e)
  }
})

module.exports = router
