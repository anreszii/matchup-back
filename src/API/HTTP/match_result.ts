import { Router } from 'express'
import { DTO } from '../../Classes/DTO/DTO'
import { TechnicalCause, TechnicalError } from '../../error'
import { validateToken } from '../../Token/index'
import { StandOff_Lobbies } from '../Sockets/index'

const router = Router()
router.post('/upload', validateToken, async (req, res, next) => {
  try {
    if (!req.files) throw new TechnicalError('files', TechnicalCause.REQUIRED)
    if (!req.files.screen || req.files.screen instanceof Array)
      throw new TechnicalError('screen', TechnicalCause.INVALID_FORMAT)

    const { lobby_id, payload } = req.body
    if (!lobby_id) throw new TechnicalError('lobby id', TechnicalCause.REQUIRED)

    const lobby = StandOff_Lobbies.get(lobby_id)
    if (!lobby) throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)

    if (
      !lobby.firstCommand.isCaptain(payload.username) &&
      !lobby.secondCommand.isCaptain(payload.username)
    )
      throw new TechnicalError('user role', TechnicalCause.NEED_HIGHER_VALUE)

    res.json(new DTO({ label: 'result upload', status: 'success' }).to.JSON)
    // uploader({
    //   apiKey: process.env.IMGBB_KEY,
    //   base64string: image.data.toString('base64'),
    //   name: `${new Date().toDateString()}-${image.name}`,
    // })
    //   .then(
    //     async (response: {
    //       thumb: { [key: string]: string }
    //       delete_url: string
    //     }) => {
    //       const document = await ImageModel.create({
    //         display_url: response.thumb.url as string,
    //         delete_url: response.delete_url as string,
    //       })
    //     },
    //   )
    //   .catch((e: unknown) => {
    //     next(e)
    //   })
  } catch (e) {
    next(e)
  }
})

module.exports = router
