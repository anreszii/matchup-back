import { Router } from 'express'
import { TechnicalCause, TechnicalError } from '../../error'
import { ImageModel } from '../../Models/Image'
import { validateToken } from '../../Token/index'

const router = Router()
router.post('/upload', validateToken, async (req, res, next) => {
  try {
    if (!req.files) throw new TechnicalError('files', TechnicalCause.REQUIRED)
    if (!req.files.image || req.files.image instanceof Array)
      throw new TechnicalError('image', TechnicalCause.INVALID_FORMAT)
    let image = req.files.image
    let document = await ImageModel.create({
      buffer: image.data,
      mimeType: image.mimetype,
    })
    res.send(document._id)
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
    res.send(image.buffer.toString('base64url'))
  } catch (e) {
    next(e)
  }
})

module.exports = router
