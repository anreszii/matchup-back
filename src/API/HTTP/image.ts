import { Router } from 'express'
import { TechnicalCause, TechnicalError } from '../../error'
import { validateToken } from '../../Token/index'
import { postToImgbb } from '../../Utils/imgbb'

import { Logger } from '../../Utils/Logger'

const router = Router()
router.post('/upload', validateToken, async (req, res, next) => {
  const logger = new Logger('HTTP', 'image/upload')
  logger.trace(
    `[${req.ip}] METHOD: ${req.method} PARAMS: ${JSON.stringify(
      req.params,
    )}; BODY: ${JSON.stringify(req.body)}; FILES: ${JSON.stringify(req.files)}`,
  )
  try {
    if (!req.files) throw new TechnicalError('files', TechnicalCause.REQUIRED)
    if (!req.files.image || req.files.image instanceof Array)
      throw new TechnicalError('image', TechnicalCause.INVALID_FORMAT)
    let image = req.files.image
    postToImgbb({
      apiKey: process.env.IMGBB_KEY as string,
      image: image.data.toString('base64'),
      name: `${new Date().toDateString()}-${image.name}`,
    })
      .then(
        (response: {
          thumb: { [key: string]: string }
          delete_url: string
        }) => {
          logger.trace(
            `
            IMGBB RESPONSE: ${response}
            SERVER RESPONSE: ${JSON.stringify({ display: response.thumb.url })}
            `,
          )
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
