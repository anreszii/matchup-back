import type { IDataEscort } from 'gamesocket.io'
import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import { WebSocketValidatior } from '../../../validation/websocket'

import { APIManager } from '../../../Classes/RoleManager/APIRolesManager'
import { API_ACTION_LIST, isValidAPIAction } from '../../../configs/API/actions'

import { MatchUpError, validationCause, ValidationError } from '../../../error'
import { WebSocket } from 'uWebSockets.js'

const wsValidator = new WebSocketValidatior(WS_SERVER)
let RoleManager = new APIManager()

/**
 * Обработчик для события dark-side.
 * В качестве пакета принимает:
 * ```json
 * {
 *  "function": "имя обработчика, имеющийся в списке доступных",
 *  "params": [],
 *  "__comment_params": "это массив параметров, которые будут переданы в вызванную функцию"
 * }
 * ```
 *
 * В случае ошибки, если function был найден, вернет событие ошибки с названием формата `${function} error` и следующим пакетом:
 * ```json
 * {
 *  "reason": "error reason message"
 * }
 * ```
 *
 * Если же function не существует, то вернет событие ошибки с названием dark-side error и следующим пакетом:
 * ```json
 * {
 *  "reason": "error reason message"
 * }
 * ```
 *
 * @category Basic
 * @event dark-side
 */
export function darkSideHandler(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string

    let action = escort.get('function')
    if (!action) throw new ValidationError('function', validationCause.REQUIRED)
    if (typeof action != 'string')
      throw new ValidationError('function', validationCause.INVALID_FORMAT)

    let params = escort.get('params')
    if (!params) throw new ValidationError('params', validationCause.REQUIRED)
    if (typeof params != 'object' || !(params instanceof Array))
      throw new ValidationError('params', validationCause.INVALID_FORMAT)

    if (!isValidAPIAction(action))
      throw new ValidationError('function', validationCause.INVALID)

    if (!RoleManager.hasAccess(username, action))
      throw new Error('Low access level')

    let handler = HANDLERS.get(action)
    if (!handler)
      throw new ValidationError('function', validationCause.NOT_EXIST)
    handler(socket, params)
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    let action = escort.get('function')
    if (!action || typeof action != 'string') {
      if (e instanceof MatchUpError) {
        if (e.genericMessage)
          return clientServer
            .control(socketID)
            .emit(`dark-side error`, { reason: e.genericMessage })
      } else if (e instanceof Error) {
        return clientServer
          .control(socketID)
          .emit(`dark-side error`, { reason: e.message })
      } else {
        return clientServer
          .control(escort.get('socket_id') as string)
          .emit(`dark-side error`, { reason: 'unknown error' })
      }
    }

    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit(`${action} error`, { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit(`${action} error`, { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit(`${action} error`, { reason: 'unknown error' })
    }
  }
}
clientServer.on('dark-side', darkSideHandler)

export const HANDLERS: Map<
  API_ACTION_LIST,
  (socket: WebSocket, params: unknown[]) => void | Promise<void>
> = new Map()
