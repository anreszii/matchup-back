import type { WebSocket } from 'uWebSockets.js'
import { CLIENT_CHATS } from '../../../../Classes/Chat/Manager'
import { Message } from '../../../../Classes/Chat/Message'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { ChatModel } from '../../../../Models/index'
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
 *  type: string,
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
export async function chat_message(socket: WebSocket, params: unknown[]) {
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
CONTROLLERS.set('chat_message', chat_message)

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
export async function chat_join(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let chatID = params[0]
  if (typeof chatID != 'string')
    throw new TechnicalError('chat', TechnicalCause.INVALID_FORMAT)

  let chat = await CLIENT_CHATS.get(chatID)
  if (!chat) throw new TechnicalError('chat', TechnicalCause.NOT_EXIST)

  await chat.join(username)
  return true
}
CONTROLLERS.set('chat_join', chat_join)

/**
 * Событие для выхода из известного чата.</br>
 * Используемый пакет:
 *
 * @param params - ['chatId: {string}']

 * @category Chat
 * @event
 */
export async function chat_leave(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let chatID = params[0]
  if (typeof chatID != 'string')
    throw new TechnicalError('chat', TechnicalCause.INVALID_FORMAT)

  let chat = await CLIENT_CHATS.get(chatID)
  if (!chat) throw new TechnicalError('chat', TechnicalCause.NOT_EXIST)

  await chat.leave(username)
  return true
}
CONTROLLERS.set('chat_leave', chat_leave)

/**
 * Событие для просмотра истории чата по времени.</br>
 * Используемый пакет:
 *
 * @param params - ["2022-01-01", "(new Date()).getTime()"]
 *
 * @category Chat
 * @event
 */
export async function load_history(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let chatID = params[0]
  if (typeof chatID != 'string')
    throw new TechnicalError('chat', TechnicalCause.INVALID_FORMAT)

  let chat = await ChatModel.get(chatID)
  if (!chat) throw new TechnicalError('chat', TechnicalCause.NOT_EXIST)

  if (typeof params[1] != 'string' || typeof params[2])
    throw new TechnicalError('date', TechnicalCause.INVALID_FORMAT)
  let first_date = new Date(params[1] as string)
  let second_date = new Date(params[2] as string)

  return chat.load_history(first_date.getTime(), second_date.getTime())
}
CONTROLLERS.set('chat_load_history', load_history)
