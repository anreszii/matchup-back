import type { WebSocket } from 'uWebSockets.js'

import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import { MatchUpError, validationCause, ValidationError } from '../../../error'

import { UserModel } from '../../../Models'
import { HANDLERS } from './dark-side'

/**
 * Событие для начала отношений с дргиум пользователем. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid thisUser
 * В данном случае в ошибке, если не будет найден пользователь, будет выведена переменная thisUser, если этим пользователем является вызывающий клиент, а
 * anotherUser - вызываемый.
 *
 * @param params - ["anotherUsername: {string}"]
 *
 *
 * В случае успеха авторизованный пользователь станет подписчиком/другом указанного пользователя.
 *
 * Прим:
 *
 * Если А был подписан на Б, и Б вызвал add_relation для А, то они станут друзьями. <br>
 * Если А не был подписан на Б, то Б, попытавшись вызвать add_relation, станет его подписчиком.
 *
 *
 * В случае успеха создает события 'new_subscriber' или 'new_friend' для того пользователя, чей список подписчиков или друзей изменился.
 * Отправляемый пакет:
 * ```json
 * {
 *   username: 'username which you have related with'
 * }
 * ```
 *
 * В случае же, если пользователь успешно подписался, ему будет отправлено событие 'subscribed'
 * Отправляемый пакет:
 * ```json
 * {
 *   username: 'username of person you subscribed to'
 * }
 * ```
 */
export function add_relation(socket: WebSocket, params: unknown[]) {
  let thisUsername = socket.username as string

  let anotherUsername = params[0]
  if (!anotherUsername)
    throw new ValidationError('username', validationCause.REQUIRED)
  if (typeof anotherUsername != 'string')
    throw new ValidationError('username', validationCause.INVALID_FORMAT)

  Promise.all([
    UserModel.findByName(thisUsername)!,
    UserModel.findByName(anotherUsername)!,
  ]).then((users) => {
    users[0].addRelation(anotherUsername as string).then((result) => {
      if (!result) return

      if (users[1].profile.relations.friends.includes(thisUsername)) {
        let sockets = clientServer.Aliases.get(thisUsername)
        if (sockets)
          clientServer
            .control(sockets)
            .emit('new_friend', { username: anotherUsername as string })
        sockets = clientServer.Aliases.get(anotherUsername as string)
        if (sockets)
          return clientServer
            .control(sockets)
            .emit('new_friend', { username: thisUsername })
        return
      }

      let sockets = clientServer.Aliases.get(thisUsername)
      if (sockets)
        clientServer
          .control(sockets)
          .emit('subscribed', { username: anotherUsername as string })
      sockets = clientServer.Aliases.get(anotherUsername as string)
      if (sockets)
        return clientServer
          .control(sockets)
          .emit('new_subscriber', { username: thisUsername })
    })
  })
}
HANDLERS.set('add_relation', add_relation)

/**
 * Событие для разрыва отношений с другим пользователем. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid thisUser
 * В данном случае в ошибке, если не будет найден пользователь, будет выведена переменная thisUser, если этим пользователем является вызывающий клиент, а
 * anotherUser - вызываемый.
 *
 * @param params - ["anotherUsername: {string}"]
 *
 * В случае успеха авторизованный пользователь отпишется/перестанет быть другом указанного пользователя.
 *
 * Прим:
 *
 * Если А был подписан на Б, и А вызвал drop_relation для Б, то A отпишется от Б. <br>
 * Если А был другом Б, попытавшись вызвать drop_relation, Б станет подписчиком А.
 *
 *
 * В случае успеха создает события 'lost_subscriber' или 'lost_friend' для того пользователя, чей список подписчиков или друзей изменился.
 * Отправляемый пакет:
 * ```json
 * {
 *   username: 'username which you have related with'
 * }
 * ```
 *
 * В случае же, если пользователь успешно отписался, ему будет отправлено событие 'unsubscribed'
 * Отправляемый пакет:
 * ```json
 * {
 *   username: 'username of person you subscribed to'
 * }
 * ```
 */
export function drop_relation(socket: WebSocket, params: unknown[]) {
  let thisUsername = socket.username as string

  let anotherUsername = params[0]
  if (!anotherUsername)
    throw new ValidationError('username', validationCause.REQUIRED)
  if (typeof anotherUsername != 'string')
    throw new ValidationError('username', validationCause.INVALID_FORMAT)

  Promise.all([
    UserModel.findByName(thisUsername),
    UserModel.findByName(anotherUsername),
  ]).then((users) => {
    users[0].dropRelation(anotherUsername as string).then((result) => {
      if (!result) return
      if (users[1].profile.relations.subscribers.includes(thisUsername)) {
        let sockets = clientServer.Aliases.get(thisUsername)
        if (sockets)
          clientServer
            .control(sockets)
            .emit('lost_friend', { username: anotherUsername as string })
        sockets = clientServer.Aliases.get(anotherUsername as string)
        if (sockets)
          return clientServer
            .control(sockets)
            .emit('lost_friend', { username: thisUsername })
        return
      }

      let sockets = clientServer.Aliases.get(thisUsername)
      if (sockets)
        clientServer
          .control(sockets)
          .emit('unsubscribed', { username: anotherUsername as string })
      sockets = clientServer.Aliases.get(anotherUsername as string)
      if (sockets)
        return clientServer
          .control(sockets)
          .emit('lost_subscriber', { username: thisUsername })
    })
  })
}
HANDLERS.set('drop_relation', drop_relation)
