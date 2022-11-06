import type { WebSocket } from 'uWebSockets.js'

import { clientServer } from '../../clientSocketServer'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { CONTROLLERS } from '../../Handlers/dark-side'
import { DTO } from '../../../../Classes/DTO/DTO'
import { UserModel } from '../../../../Models/index'

/**
 * Событие для начала отношений с дргиум пользователем. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid thisUser
 * В данном случае в ошибке, если не будет найден пользователь, будет выведена переменная thisUser, если этим пользователем является вызывающий клиент, а
 * anotherUser - вызываемый.
 *
 * @param params - ["anotherUsername: {string}"]
 *
 *
 * В случае успеха авторизованный пользователь станет подписчиком/другом указанного пользователя
 *
 * ```ts
 * {
 *   event: "realtion"
 *   label: "add"
 *   content: {
 *     username: string
 *   }
 * }
 * ```
 */
export async function add_relation(socket: WebSocket, params: unknown[]) {
  let thisUsername = socket.username as string

  let anotherUsername = params[0]
  if (!anotherUsername)
    throw new TechnicalError('username', TechnicalCause.REQUIRED)
  if (typeof anotherUsername != 'string')
    throw new TechnicalError('username', TechnicalCause.INVALID_FORMAT)

  const users = await Promise.all([
    UserModel.findByName(thisUsername)!,
    UserModel.findByName(anotherUsername)!,
  ])

  let result = await users[0].addRelation(anotherUsername as string)
  if (!result) throw new TechnicalError('relation', TechnicalCause.CAN_NOT_ADD)

  const thisUserResponse = new DTO({ label: 'add', username: anotherUsername })
  const anotherUserResponse = new DTO({ label: 'add', username: thisUsername })

  let sockets = clientServer.Aliases.get(thisUsername)
  if (sockets)
    clientServer.control(sockets).emit('relation', thisUserResponse.to.JSON)

  sockets = clientServer.Aliases.get(anotherUsername as string)
  if (sockets)
    clientServer.control(sockets).emit('relation', anotherUserResponse.to.JSON)

  return true
}
CONTROLLERS.set('add_relation', add_relation)

/**
 * Событие для разрыва отношений с другим пользователем. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid thisUser
 * В данном случае в ошибке, если не будет найден пользователь, будет выведена переменная thisUser, если этим пользователем является вызывающий клиент, а
 * anotherUser - вызываемый.
 *
 * @param params - ["anotherUsername: {string}"]
 *
 * В случае успеха авторизованный пользователь отпишется/перестанет быть другом указанного пользователя.
 * Также обоим пользователям будет отправлен следующий пакет данных:
 *
 * ```ts
 * {
 *   event: "realtion"
 *   label: "drop"
 *   content: {
 *     username: string
 *   }
 * }
 * ```
 */
export async function drop_relation(socket: WebSocket, params: unknown[]) {
  let thisUsername = socket.username as string

  let anotherUsername = params[0]
  if (!anotherUsername)
    throw new TechnicalError('username', TechnicalCause.REQUIRED)
  if (typeof anotherUsername != 'string')
    throw new TechnicalError('username', TechnicalCause.INVALID_FORMAT)

  const users = await Promise.all([
    UserModel.findByName(thisUsername),
    UserModel.findByName(anotherUsername),
  ])

  const result = await users[0].dropRelation(anotherUsername as string)
  if (!result)
    throw new TechnicalError('relation', TechnicalCause.CAN_NOT_DELETE)

  const thisUserResponse = new DTO({ label: 'drop', username: anotherUsername })
  const anotherUserResponse = new DTO({ label: 'drop', username: thisUsername })

  let sockets = clientServer.Aliases.get(thisUsername)
  if (sockets)
    clientServer.control(sockets).emit('relation', thisUserResponse.to.JSON)

  sockets = clientServer.Aliases.get(anotherUsername as string)
  if (sockets)
    clientServer.control(sockets).emit('relation', anotherUserResponse.to.JSON)

  return true
}
CONTROLLERS.set('drop_relation', drop_relation)
