import { app } from './clientSocketServer'
import type { IDataEscort } from 'gamesocket.io/lib/DataManager/DataEscort/DataEscort'

import { WebSocketValidatior } from '../../validation/websocket'
import { validatePacket } from '../../Token'
import { MatchUpError } from '../../error'

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
 * @event authorize
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
