import type fileUpload = require('express-fileupload')
import { Response, Router } from 'express'
import { DTO } from '../../Classes/DTO/DTO'
import { TechnicalCause, TechnicalError } from '../../error'
import { validateToken } from '../../Token/index'
import { parseResults } from '../../Utils/resultParser'
import FormData = require('form-data')
import { IncomingMessage } from 'http'
import { MatchModerationRecordModel } from '../../Models/Moderation/ModerateMatchs'
import { PLAYERS } from '../../Classes/MatchMaking/Player/Manager'
import { CachedLobbies, LobbyCache } from '../../Classes/MatchMaking/LobbyCache'
import { StandOff_Lobbies } from '../../Classes/MatchMaking/Lobby/Manager'

import { Logger } from '../../Utils/Logger'
import { S3Storage } from '../../Classes/S3/S3Storage'
import { Match } from '../../Interfaces'
import { PlayerSignals } from '../../Interfaces/MatchMaking/Player'
const s3 = new S3Storage('ru-1')
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
      )}; BODY: ${JSON.stringify(expressRequest.body)}; FILES IS UNDEFINED: ${
        expressRequest.files == undefined
      }`,
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
      const player = PLAYERS.get(username)
      if (!player || !player.PublicData.lobbyID)
        throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)

      const lobbyObject = StandOff_Lobbies.get(player.PublicData.lobbyID)
      if (!lobbyObject) {
        player.event(PlayerSignals.corrupt)
        throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
      }
      if (lobbyObject.state != Match.Lobby.States.started)
        throw new TechnicalError('lobby status', TechnicalCause.INVALID)

      let lobby = await CachedLobbies.get(player.PublicData.lobbyID)
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
    try {
      const document = parseResults(
        chunks.join(' '),
        lobby.lobbyID,
        lobby.map as string,
      )
      let screen = await s3.upload(image.data)
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
    } catch (e) {
      if (e instanceof Error) logger.critical(`[ERROR ${e.name}]: ${e.message}`)
      expressResponse.sendStatus(500)
    }
  })
}

module.exports = router
