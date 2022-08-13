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
import { MatchListModel } from '../../Models/MatchList'

let clientServer = app.of('client')
let wsValidator = new WebSocketValidatior(app)

/**
 * Событие для получения списка пользователей. </br>
 * По-умолчанию возвращает всех пользователей. </br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "token": string //полученный при авторизации пользователя
 *  "username"?: string //поиск по имени внутри приложения
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
 */
export async function getUserList(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let role = app.sockets.get(socketID)!.role as userRole
    if (role != 'admin')
      throw new ValidationError('user role', validationCause.INVALID)

    let userNameToFind = escort.get('username')
    if (!userNameToFind) {
      let page: string = JSON.stringify(await User.find({}))
      clientServer.control(socketID).emit('get_users', page)
      return
    }

    if (typeof userNameToFind != 'string')
      throw new ValidationError('username', validationCause.INVALID_FORMAT)
    let user = await User.findOne({ 'profile.username': userNameToFind })
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)

    return clientServer.control(socketID).emit('get_users', user.toJSON())
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

/**
 * Событие для получения матчей. </br>
 * По-умолчанию возвращает все матчи</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "token": string //полученный при авторизации пользователя
 *  "matchID"?: string //ID матча, который нужно посмотреть
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
 * @event get_match
 */
export async function getMatch(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let role = app.sockets.get(socketID)!.role as userRole
    if (role != 'admin')
      throw new ValidationError('user role', validationCause.INVALID)
    let matchID = escort.get('matchID')
    if (!matchID)
      return clientServer
        .control(socketID)
        .emit('get_match', JSON.stringify(await MatchListModel.getAll()))
    if (typeof matchID != 'string')
      throw new ValidationError('matchID', validationCause.INVALID_FORMAT)

    let match = await MatchListModel.findByID(matchID)
    if (!match) throw new ValidationError('matchID', validationCause.INVALID)

    return clientServer.control(socketID).emit('get_match', match.toJSON())
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('get_match error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('get_match error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('get_match error', { reason: 'unknown error' })
    }
  }
}
