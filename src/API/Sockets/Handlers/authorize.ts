import type { IDataEscort } from 'gamesocket.io'
import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'

import { validatePacket } from '../../../Token/index'
import { isMatchUpError, ServerCause, ServerError } from '../../../error'
import { DTO } from '../../../Classes/DTO/DTO'
import { dtoParser } from '../../../Classes/DTO/Parser/Parser'
import { WebSocketValidatior } from '../../../validation/websocket'
import { ChatStore } from '../../../Classes/Chat/Store'
import { Logger } from '../../../Utils/Logger'

let wsValidator = new WebSocketValidatior(WS_SERVER)

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
 * @category Authorization
 * @event
 */
export async function authorize(escort: IDataEscort) {
  const logger = new Logger('authorize')
  logger.trace(`[REQUETS] DATA: ${JSON.stringify(escort.used)}`)
  try {
    let response: DTO
    const request = dtoParser.from.Object(escort.used)
    let token = validatePacket(request)

    let socketID = escort.get('socket_id') as string
    let socket = WS_SERVER.sockets.get(socketID)!

    socket.role = token.role
    socket.username = token.username

    wsValidator.authorizeSocket(socketID)

    clientServer.Aliases.set(socket.username, socket.id)
    response = new DTO({ label: request.label, status: 'success' })
    await ChatStore.joinChats(socket.username)
    return clientServer.control(socketID).emit('authorize', response.to.JSON)
  } catch (e) {
    if (e instanceof Error)
      logger.warning(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
    let socketID = escort.get('socket_id') as string
    const request = dtoParser.from.Object(escort.used)

    let error: DTO
    if (!isMatchUpError(e))
      error = new ServerError(ServerCause.UNKNOWN_ERROR).DTO
    else error = e.DTO

    error.label = request.label
    clientServer.control(socketID).emit(`dark-side`, error.to.JSON)
  }
}
clientServer.on('authorize', authorize)
