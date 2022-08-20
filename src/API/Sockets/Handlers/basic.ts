import { app } from '../clientSocketServer.js'
import type { IDataEscort } from 'gamesocket.io/lib/DataManager/DataEscort/DataEscort.js'

import { WebSocketValidatior } from '../../../validation/websocket.js'
import { validatePacket } from '../../../Token/index.js'
import {
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../../error.js'

let clientServer = app.of('client')
let wsValidator = new WebSocketValidatior(app)

/**
 * Событие для авторизации сокета. </br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *  token: string //полученный при авторизации пользователя
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 *
 * ```ts
 * {
 *  complete: true
 * }
 * ```
 * @category Authorization
 * @event
 */
export function authorize(escort: IDataEscort) {
  try {
    let token = validatePacket(escort)
    let socketID = escort.get('socket_id') as string

    wsValidator.authorizeSocket(socketID)
    let name = token.username as string
    let socket = app.sockets.get(socketID)!
    socket.role = token.role

    app.aliases.set(name, socketID)
    return clientServer.control(socketID).emit('authorize', { complete: true })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('authorize error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('authorize error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('authorize error', { reason: 'unknown error' })
    }
  }
}

/**
 * Событие для смены роли сокета пользователя. </br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *  newRole: string //"default" | "privileged" | "admin" //новая роль пользователя
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 *
 * ```ts
 * {
 *  role: string //"default" | "privileged" | "admin". текущая роль пользователя
 * }
 * ```
 *
 * В случае, если новая роль не была указана - возвращает в ответном событии текущую
 * @category Authorization
 * @event
 */
export function change_role(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = app.sockets.get(socketID)!
    let role = escort.get('newRole')
    if (!role)
      return clientServer
        .control(socketID)
        .emit('change_role', { role: socket.role })
    if (
      typeof role != 'string' ||
      (role != 'default' && role != 'privileged' && role != 'admin')
    )
      throw new ValidationError('newRole', validationCause.INVALID)

    socket.role = role
    return clientServer.control(socketID).emit('change_role', { role })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('change_role error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('change_role error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('change_role error', { reason: 'unknown error' })
    }
  }
}
