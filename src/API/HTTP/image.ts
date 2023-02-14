import { Router } from 'express'
import { TechnicalCause, TechnicalError } from '../../error'
import { validateToken } from '../../Token/index'

import { Logger } from '../../Utils/Logger'
import { S3Storage } from '../../Classes/S3/S3Storage'

const s3 = new S3Storage('ru-1')
const router = Router()
router.post('/upload', validateToken, async (req, res, next) => {
  const logger = new Logger('HTTP', 'image/upload')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES IS UNDEFINED: ${
      req.files == undefined
    }`,
  )
  try {
    if (!req.files) throw new TechnicalError('files', TechnicalCause.REQUIRED)
    if (!req.files.image || req.files.image instanceof Array)
      throw new TechnicalError('image', TechnicalCause.INVALID_FORMAT)
    res.json({ display: await s3.upload(req.files.image.data) })
  } catch (e) {
    next(e)
  }
})

module.exports = router
