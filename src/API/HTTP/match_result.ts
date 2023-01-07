import type fileUpload = require('express-fileupload')
import { Response, Router } from 'express'
import { DTO } from '../../Classes/DTO/DTO'
import { TechnicalCause, TechnicalError } from '../../error'
import { validateToken } from '../../Token/index'
import { StandOff_Lobbies } from '../Sockets/index'
import { parseResults } from '../../Utils/resultParser'
import FormData = require('form-data')
import { IncomingMessage } from 'http'
import { Match } from '../../Interfaces/index'
import { MatchModerationRecordModel } from '../../Models/Moderation/ModerateMatchs'
import { PLAYERS } from '../../Classes/MatchMaking/MemberManager'
const uploader = require('imgbb-uploader')

const router = Router()
router.post(
  '/upload',
  validateToken,
  async (expressRequest, expressResponse, next) => {
    try {
      if (!expressRequest.files)
        throw new TechnicalError('files', TechnicalCause.REQUIRED)
      if (
        !expressRequest.files.screen ||
        expressRequest.files.screen instanceof Array
      )
        throw new TechnicalError('screen', TechnicalCause.INVALID_FORMAT)

      const { payload } = expressRequest.body
      let username = payload.username as string
      let member = await PLAYERS.get(username)
      if (!member || !member.lobbyID)
        throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)

      const lobby = StandOff_Lobbies.get(member.lobbyID)
      if (!lobby) {
        if (!lobby) member.lobbyID = undefined
        throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
      }

      if (lobby.status != 'started' || lobby.type != 'rating')
        throw new TechnicalError('lobby', TechnicalCause.INVALID)

      if (
        !lobby.firstCommand.isCaptain(payload.username) &&
        !lobby.secondCommand.isCaptain(payload.username)
      )
        throw new TechnicalError('user role', TechnicalCause.NEED_HIGHER_VALUE)
      let body = new FormData()

      body.append('img', expressRequest.files.screen.data, {
        filename: 'image.jpg',
        contentType: expressRequest.files.screen.mimetype,
      })
      body.submit(
        {
          method: 'post',
          host: '217.25.93.43',
          port: 5555,
          path: '/recog',
          headers: {
            'Content-Length': body.getLengthSync(),
          },
        },
        (err, formResponse) => {
          try {
            if (err) throw err
            parseRespone(
              formResponse,
              expressResponse,
              expressRequest.files!.screen as fileUpload.UploadedFile,
              lobby,
            )
          } catch (e) {
            next(e)
          }
        },
      )
    } catch (e) {
      next(e)
    }
  },
)

function parseRespone(
  formResponse: IncomingMessage,
  expressResponse: Response,
  image: fileUpload.UploadedFile,
  lobby: Match.Lobby.Instance,
) {
  const chunks: any[] = []
  if (image instanceof Array) throw new Error('array')

  formResponse.on('readable', () => {
    chunks.push(formResponse.read())
  })

  formResponse.on('end', async () => {
    try {
      const imgbbResponse = await uploader({
        apiKey: process.env.IMGBB_KEY,
        base64string: image.data.toString('base64'),
        name: `${new Date().toDateString()}-${image.name}`,
      })
      const document = parseResults(chunks.join(' '), lobby.id, lobby.map!)
      document.screen = imgbbResponse.thumb.url
      await document.save()
      await MatchModerationRecordModel.createTask(document._id)

      return expressResponse.json(
        new DTO({ label: 'result upload', status: 'success' }).to.JSON,
      )
    } catch (e) {
      throw e
    }
  })
}

module.exports = router
