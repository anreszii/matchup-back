import type { WebSocket } from 'uWebSockets.js'
import { CLIENT_CHATS } from '../../../../Classes/Chat/Manager'
import { Message } from '../../../../Classes/Chat/Message'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { CONTROLLERS } from '../../Handlers/dark-side'

/**
 * Событие для отправки сообщения в известный чат.</br>
 * Используемый пакет:
 *
 * @param params - ["chatId", "message"]
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  complete: true
 * }
 * ```
 * Все события из чата матча будут приходить на event chat в формате:
 *
 * ```jts
 * {
 *  id:string,
 *  message:
 *  {
 *    author: string,
 *    content: string
 *  }
 * }
 * ```
 * @category Chat
 * @event
 */
export async function message(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let chatID = params[0]
  if (typeof chatID != 'string')
    throw new TechnicalError('chat', TechnicalCause.INVALID_FORMAT)

  let content = params[1]
  if (typeof content != 'string')
    throw new TechnicalError('message', TechnicalCause.INVALID_FORMAT)

  let chat = await CLIENT_CHATS.get(chatID)
  if (!chat) throw new TechnicalError('chat', TechnicalCause.NOT_EXIST)

  let message = new Message(username, content)
  await chat.message(message)

  return true
}
CONTROLLERS.set('chat_message', message)

/**
 * Событие для повторного входа в известный чат.</br>
 * Используемый пакет:
 *
 * @param params - ['chatId: {string}']
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  complete: true
 * }
 * ```
 * Все события из чата матча будут приходить на event chat в формате:
 *
 * ```jts
 * {
 *  id:string,
 *  message:
 *  {
 *    author: string,
 *    content: string
 *  }
 * }
 * ```
 * @category Chat
 * @event
 */
export async function join(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let chatID = params[0]
  if (typeof chatID != 'string')
    throw new TechnicalError('chat', TechnicalCause.INVALID_FORMAT)

  let chat = await CLIENT_CHATS.get(chatID)
  if (!chat) throw new TechnicalError('chat', TechnicalCause.NOT_EXIST)

  await chat.join(username)
  return true
}
CONTROLLERS.set('chat_join', message)

/**
 * Событие для выхода из известного чата.</br>
 * Используемый пакет:
 *
 * @param params - ['chatId: {string}']
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  complete: true
 * }
 * ```
 * @category Basic
 * @event
 */
export async function leave(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let chatID = params[0]
  if (typeof chatID != 'string')
    throw new TechnicalError('chat', TechnicalCause.INVALID_FORMAT)

  let chat = await CLIENT_CHATS.get(chatID)
  if (!chat) throw new TechnicalError('chat', TechnicalCause.NOT_EXIST)

  await chat.leave(username)
  return true
}
CONTROLLERS.set('chat_leave', message)
