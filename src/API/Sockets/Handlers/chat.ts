import type { WebSocket } from 'uWebSockets.js'
import { clientServer } from '../clientSocketServer'
import { validationCause, ValidationError } from '../../../error'
import { CHATS } from '../../../Classes/index'

/**
 * Событие для отправки сообщения в лобби.</br>
 * Используемый пакет:
 *
 * @param params - ['chatId: {string}', 'message: {string}']
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
export async function chat(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let chatID = params[0]
  if (typeof chatID != 'string')
    throw new ValidationError('chat', validationCause.INVALID_FORMAT)

  let chat = CHATS.get(chatID)
  if (!chat) throw new ValidationError('chat', validationCause.NOT_EXIST)

  let message = params[1]
  if (typeof message != 'string')
    throw new ValidationError('message', validationCause.INVALID_FORMAT)

  await chat.send({
    from: username,
    content: message,
  })

  clientServer.control(socket.id).emit('chat', { complete: true })
}
