import { app } from './clientSocketServer'
import type { IDataEscort } from 'gamesocket.io/lib/DataManager/DataEscort/DataEscort'
import {
  matchCause,
  MatchError,
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../error'

import { WebSocketValidatior } from '../../validation/websocket'
import { validatePacket } from '../../Token'
import { IUser, User, userRole } from '../../Models'

let clientServer = app.of('client')
let wsValidator = new WebSocketValidatior(app)

/**
 * Событие для авторизации сокета. </br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "token": string //полученный при авторизации пользователя
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 *
 * ```json
 * {
 *  "complete": true
 * }
 * ```
 * @event get_users
 * */
export async function getUserList(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let role = app.sockets.get(socketID)!.role as userRole
    if (role != 'admin')
      throw new ValidationError('user role', validationCause.INVALID)

    let page: string = JSON.stringify(await User.find({}))
    clientServer.control(socketID).emit('get_users', page)
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('get_users error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('get_users error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('get_users error', { reason: 'unknown error' })
    }
  }
}

export function getStatistic(escort: IDataEscort) {}

export function getReports(escort: IDataEscort) {}

export function getMatch(escort: IDataEscort) {}
