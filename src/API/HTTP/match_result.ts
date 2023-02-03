import type fileUpload = require('express-fileupload')
import { Response, Router } from 'express'
import { DTO } from '../../Classes/DTO/DTO'
import { TechnicalCause, TechnicalError } from '../../error'
import { validateToken } from '../../Token/index'
import { parseResults } from '../../Utils/resultParser'
import FormData = require('form-data')
import { IncomingMessage } from 'http'
import { MatchModerationRecordModel } from '../../Models/Moderation/ModerateMatchs'
import { PLAYERS } from '../../Classes/MatchMaking/MemberManager'
import { postToImgbb } from '../../Utils/imgbb'
import { CachedLobbies, LobbyCache } from '../../Classes/MatchMaking/LobbyCache'
import { StandOff_Lobbies } from '../Sockets'

import { Logger } from '../../Utils/Logger'
const logger = new Logger('HTTP', 'result/upload')

const router = Router()
router.post(
  '/upload',
  validateToken,
  async (expressRequest, expressResponse, next) => {
    logger.trace(
      `[${expressRequest.ip}] METHOD: ${
        expressRequest.method
      } PARAMS: ${JSON.stringify(
        expressRequest.params,
      )}; BODY: ${JSON.stringify(expressRequest.body)}; FILES: ${JSON.stringify(
        expressRequest.files,
      )}`,
    )
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

      const lobbyObject = StandOff_Lobbies.get(member.lobbyID)
      if (!lobbyObject) {
        member.lobbyID = undefined
        throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
      }
      if (lobbyObject.state != 'started')
        throw new TechnicalError('lobby status', TechnicalCause.INVALID)

      let lobby = await CachedLobbies.get(member.lobbyID)
      if (!lobby)
        throw new TechnicalError('lobby cache', TechnicalCause.NOT_EXIST)

      if (lobby.owner != payload.username)
        throw new TechnicalError('user role', TechnicalCause.NEED_HIGHER_VALUE)
      let body = new FormData()

      body.append('img', expressRequest.files.screen.data, {
        filename: 'image.jpg',
        contentType: expressRequest.files.screen.mimetype,
      })
      logger.trace(`SUBMIT DATA TO PARSER`)
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
              lobby!,
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
  lobby: LobbyCache,
) {
  logger.trace(`PARSING RECOGNIZER RESPOSNE`)
  const chunks: any[] = []
  if (image instanceof Array) throw new Error('array')

  formResponse.on('readable', () => {
    chunks.push(formResponse.read())
  })

  formResponse.on('end', async () => {
    const document = parseResults(
      chunks.join(' '),
      lobby.lobbyID,
      lobby.map as string,
    )
    let screen: string
    return postToImgbb({
      apiKey: process.env.IMGBB_KEY as string,
      image: image.data.toString('base64'),
      name: `${new Date().toDateString()}-${image.name}`,
    })
      .then((imgbbResponse) => {
        screen = imgbbResponse.thumb.url
      })
      .catch((e) => {
        logger.warning(e)
      })
      .finally(async () => {
        document.screen = screen
        logger.trace('SAVING MATCH SCREEN')
        await document.save()
        await MatchModerationRecordModel.createTask(document._id)
        let objLobby = StandOff_Lobbies.get(lobby.lobbyID)
        if (objLobby) {
          logger.trace(`DELETING LOBBY ${objLobby.id}`)
          objLobby.markToDelete()
        }

        logger.trace(
          `SERVER RESPONSE: ${
            new DTO({ label: 'result upload', status: 'success' }).to.JSON
          }`,
        )
        return expressResponse.json(
          new DTO({ label: 'result upload', status: 'success' }).to.JSON,
        )
      })
  })
}

module.exports = router
