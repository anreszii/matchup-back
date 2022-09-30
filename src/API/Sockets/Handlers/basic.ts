import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import type { IDataEscort } from 'gamesocket.io'

import { WebSocketValidatior } from '../../../validation'
import { validatePacket } from '../../../Token'
import {
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../../error.js'
import { ChatManager } from '../../../Classes/index'

let wsValidator = new WebSocketValidatior(WS_SERVER)
const chats = new ChatManager()

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
    let socket = WS_SERVER.sockets.get(socketID)!
    socket.role = token.role
    socket.username = name

    clientServer.Aliases.set(name, socketID)
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
clientServer.on('authorize', authorize)

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

    let socket = WS_SERVER.sockets.get(socketID)!
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
clientServer.on('change_role', change_role)

/**
 * Событие для отправки сообщения в лобби.</br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *  chat_id: string
 *  message: string
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  complete: true
 * }
 * ```
 * Все события из чата матча будут приходить на event chat в формате:
 *
 * ```json
 * {
 *  "chat_id":"lobby#xxxx",
 *  "message":
 *  {
 *    "from": "system or username",
 *    "message": "text of message"
 *  }
 * }
 * ```
 * @category Basic
 * @event
 */
export async function send_to_chat(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string

    let chatID = escort.get('chat_id')

    if (typeof chatID != 'string')
      throw new ValidationError('chat', validationCause.INVALID_FORMAT)

    let chat = chats.get(chatID)
    if (!chat) throw new ValidationError('chat', validationCause.NOT_EXIST)

    let message = escort.get('message')
    if (typeof message != 'string')
      throw new ValidationError('message', validationCause.INVALID_FORMAT)

    await chat.send(
      JSON.stringify({
        from: username,
        message: message,
      }),
    )

    clientServer.control(socketID).emit('send_to_lobby', { complete: true })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('send_to_lobby error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('send_to_lobby error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('send_to_lobby error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('send_to_chat', send_to_chat)
