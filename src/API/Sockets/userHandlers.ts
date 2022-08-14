import { app } from './clientSocketServer'
import type { IDataEscort } from 'gamesocket.io/lib/DataManager/DataEscort/DataEscort'
import { MatchUpError, validationCause, ValidationError } from '../../error'

import { WebSocketValidatior } from '../../validation/websocket'
import { userRole } from '../../Models'
import { GlobalStatistic } from '../../Models/GlobalStatistic'

let clientServer = app.of('client')
let wsValidator = new WebSocketValidatior(app)

/**
 * Событие для получения репортов. </br>
 * По-умолчанию возвращает все матчи</br>
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *
 * }
 * ```
 *
 * @event get_statistic
 */
export async function getStatistic(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let role = app.sockets.get(socketID)!.role
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
