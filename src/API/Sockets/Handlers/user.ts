import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import type { IDataEscort } from 'gamesocket.io'
import { MatchUpError, validationCause, ValidationError } from '../../../error'

import { WebSocketValidatior } from '../../../validation'
import { GlobalStatistic } from '../../../Models'

let wsValidator = new WebSocketValidatior(WS_SERVER)

/**
 * Событие для получения глоьальной статистики. </br>
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *   newPrivileged: number,
 *   newUser: number
 * }
 * ```
 * @category User
 * @event
 */
export async function get_statistic(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let role = WS_SERVER.sockets.get(socketID)!.role
    if (!role) throw new ValidationError('user role', validationCause.REQUIRED)

    await GlobalStatistic.update()
    return clientServer.control(socketID).emit(
      'get_statistic',
      JSON.stringify({
        newPrivileged: GlobalStatistic.privilegedCounter,
        newUser: GlobalStatistic.userCounter,
      }),
    )
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('get_statistic error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('get_statistic error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('get_statistic error', { reason: 'unknown error' })
    }
  }
}
