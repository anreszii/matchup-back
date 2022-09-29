import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import type { IDataEscort } from 'gamesocket.io'
import { MatchUpError, validationCause, ValidationError } from '../../../error'

import { WebSocketValidatior } from '../../../validation'
import { GlobalStatistic, UserModel } from '../../../Models'
import { TaskListModel } from '../../../Models/Task/TaskList'

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
export async function load_statistic(escort: IDataEscort) {
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
clientServer.on('load_statistic', load_statistic)

/**
 * Событие для получения ежедневных заданий пользователя. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid user
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *   [
 *      {
 *        owner: string
 *        name: string
 *        flags: {
 *          complete: boolean
 *          static: boolean
 *        },
 *        rewards: [
 *          {
 *            amount: number,
 *            type: 'exp' | 'mp'
 *          }
 *        ]
 *        progress: {
 *           current_points: number
 *           required_points: number
 *        }
 *      }
 *   ]
 * }
 * ```
 * @category User
 * @event
 */
export async function load_daily_tasks(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)
    let socket = WS_SERVER.sockets.get(socketID)!

    let role = socket!.role
    if (!role) throw new ValidationError('user role', validationCause.REQUIRED)

    let username = socket.username as string
    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

    let taskList = await TaskListModel.findListByUser(user)
    if (!taskList) taskList = await TaskListModel.createListForUser(user)
    let dailyTasks = await taskList.getDaily()
    clientServer
      .control(clientServer.Aliases.get(username)!)
      .emit('load_daily_tasks', JSON.stringify(dailyTasks))
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('load_daily_tasks error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('load_daily_tasks error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('load_daily_tasks error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('load_daily_tasks', load_daily_tasks)

/**
 * Событие для получения данных авторизованного пользователя. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid user
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *
 * }
 * ```
 * @category User
 * @event
 */
export async function load_user(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)
    let socket = WS_SERVER.sockets.get(socketID)!

    let role = socket!.role
    if (!role) throw new ValidationError('user role', validationCause.REQUIRED)

    let username = socket.username as string
    let user = await UserModel.getPublicData(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

    clientServer
      .control(clientServer.Aliases.get(username)!)
      .emit('load_user', JSON.stringify(user))
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('load_user error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('load_user error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('load_user error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('load_user', load_user)
