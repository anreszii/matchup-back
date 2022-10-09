import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import type { IDataEscort } from 'gamesocket.io'
import { MatchUpError, validationCause, ValidationError } from '../../../error'

import { WebSocketValidatior } from '../../../validation'
import { GlobalStatistic, UserModel, TaskListModel } from '../../../Models'

let wsValidator = new WebSocketValidatior(WS_SERVER)

/**
 * Событие для получения глобальной статистики зарегистрировавшихся за месяц пользователей.</br>
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
export async function get_global_statistic(escort: IDataEscort) {
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
clientServer.on('get_global_statistic', get_global_statistic)

/**
 * Событие для получения ежедневных заданий пользователя. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid user
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *   [Task1, Task2]
 * }
 * ```
 *
 * Task
 * ```json
 * {
 *    owner: string
 *    name: string
 *    flags: {
 *       complete: boolean
 *       static: boolean
 *     },
 *    rewards: [
 *      {
 *        amount: number,
 *        type: 'exp' | 'mp'
 *      }
 *    ]
 *   progress: {
 *     current_points: number
 *     required_points: number
 *   }
 * }
 * ```
 * @category User
 * @event
 */
export async function get_daily_tasks(escort: IDataEscort) {
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
      .emit('get_daily_tasks', JSON.stringify(dailyTasks))
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
clientServer.on('get_daily_tasks', get_daily_tasks)

/**
 * Событие для количества выполненных ежедневных заданий пользователя. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid user
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *   count: 3
 * }
 * ```
 * @category User
 * @event
 */
export async function get_completed_daily_tasks_count(escort: IDataEscort) {
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
    let count = await taskList.getCompletedDailyTasksCount()
    clientServer
      .control(socketID)
      .emit('get_completed_daily_tasks_count', JSON.stringify({ count }))
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
clientServer.on('get_daily_tasks', get_daily_tasks)

/**
 * Событие для получения наград с ежедневных заданий. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid user
 *
 * В случае успеха создает ивенты add_mp, add_exp, add_bp_level со следующими данными:
 *
 * Пакет для add_mp
 * ```json
 * {
 *    amount: 1000
 * }
 * ```
 *
 * Пакет для add_exp
 * ```json
 * {
 *    amount: 1000
 * }
 * ```
 * Пакет для new_bp_level
 * ```json
 * {
 *    amount: 1 //количество новых уровней
 * }
 * ```
 * @category User
 * @event
 */
export async function collect_rewards_from_daily(escort: IDataEscort) {
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
    let reward = await taskList.collectRewardsFromDaily()
    if (!reward) return

    let sockets = clientServer.Aliases.get(username)!
    if (reward.levels)
      clientServer
        .control(sockets)
        .emit('add_bp_level', { amount: reward.levels })
    if (reward.mp)
      clientServer.control(sockets).emit('add_mp', { amount: reward.mp })
    if (reward.exp)
      clientServer.control(sockets).emit('add_exp', { amount: reward.exp })
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
clientServer.on('collect_rewards_from_daily', collect_rewards_from_daily)

/**
 * Событие для обновлении и получении данных  пользователя о текущем достигнутом уровне BattlePass. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid user
 *
 * В случае успеха создает ивенты add_mp, add_exp, add_bp_level и отправляет на него JSON объект
 *
 * Пакет для add_mp
 * ```json
 * {
 *    amount: 1000
 * }
 * ```
 *
 * Пакет для add_exp
 * ```json
 * {
 *    amount: 1000
 * }
 * ```
 *
 * Пакет для add_bp_level
 * ```json
 * {
 *    amount: 1000
 * }
 * ```
 * @category User
 * @event
 */
export async function check_level(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)
    let socket = WS_SERVER.sockets.get(socketID)!

    let role = socket!.role
    if (!role) throw new ValidationError('user role', validationCause.REQUIRED)

    let username = socket.username as string
    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

    let result = user.checkLevel()
    await user.save()

    if (result.previous.currentBPLevel == result.current.currentBPLevel) return
    let sockets = clientServer.Aliases.get(username)!

    clientServer.control(sockets).emit('add_bp_level', {
      amount: result.current.currentBPLevel - result.previous.currentBPLevel,
    })

    let reward = result.previous.reward
    if (reward)
      return clientServer
        .control(sockets)
        .emit(`add_${reward.type}`, { amount: reward.amount })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('check_level error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('check_level error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('check_level error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('check_level', check_level)

/**
 * Событие для получения данных авторизованного пользователя. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid user
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект
 * Документа модели User с полями id, credentials.email, credentials.region, profile, level, rating, role, prefix, guild
 * @category User
 * @event
 */
export async function get_user_data(escort: IDataEscort) {
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
      .emit('get_user_data', JSON.stringify(user))
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('get_user_data error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('get_user_data error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('get_user_data error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('get_user_data', get_user_data)

/**
 * Событие для начала отношений с дргиум пользователем. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid thisUser
 * В данном случае в ошибке, если не будет найден пользователь, будет выведена переменная thisUser, если этим пользователем является вызывающий клиент, а
 * anotherUser - вызываемый.
 *
 *
 * Пакет, который принимает обработчик:
 * ```json
 * {
 *   username: 'user which you want to be related with'
 * }
 * ````
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
export async function add_relation(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)
    let socket = WS_SERVER.sockets.get(socketID)!

    let role = socket!.role
    if (!role)
      throw new ValidationError('thisUser role', validationCause.REQUIRED)

    let thisUsername = socket.username as string
    let user = await UserModel.findByName(thisUsername)
    if (!user) throw new ValidationError('thisUser', validationCause.INVALID)

    let anotherUsername = escort.get('username')
    if (!anotherUsername)
      throw new ValidationError('username', validationCause.REQUIRED)
    if (typeof anotherUsername != 'string')
      throw new ValidationError('username', validationCause.INVALID_FORMAT)

    let result = user.addRelation(anotherUsername)
    if (!result) return

    let anotherUser = await UserModel.findByName(anotherUsername)!
    if (anotherUser.profile.relations.friends.includes(thisUsername)) {
      let sockets = clientServer.Aliases.get(thisUsername)
      if (sockets)
        clientServer
          .control(sockets)
          .emit('new_friend', { username: anotherUsername })
      sockets = clientServer.Aliases.get(anotherUsername)
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
        .emit('subscribed', { username: anotherUsername })
    sockets = clientServer.Aliases.get(anotherUsername)
    if (sockets)
      return clientServer
        .control(sockets)
        .emit('new_subscriber', { username: thisUsername })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('add_relation error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add_relation error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add_relation error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('add_relation', add_relation)

/**
 * Событие для разрыва отношений с другим пользователем. </br>
 * В случае, если соединение работает после удаления пользователя, вернет invalid thisUser
 * В данном случае в ошибке, если не будет найден пользователь, будет выведена переменная thisUser, если этим пользователем является вызывающий клиент, а
 * anotherUser - вызываемый.
 *
 *
 * Пакет, который принимает обработчик:
 * ```json
 * {
 *   username: 'user which you want to be related with'
 * }
 * ````
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
export async function drop_relation(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)
    let socket = WS_SERVER.sockets.get(socketID)!

    let role = socket!.role
    if (!role)
      throw new ValidationError('thisUser role', validationCause.REQUIRED)

    let thisUsername = socket.username as string
    let user = await UserModel.findByName(thisUsername)
    if (!user) throw new ValidationError('thisUser', validationCause.INVALID)

    let anotherUsername = escort.get('username')
    if (!anotherUsername)
      throw new ValidationError('username', validationCause.REQUIRED)
    if (typeof anotherUsername != 'string')
      throw new ValidationError('username', validationCause.INVALID_FORMAT)

    let result = user.dropRelation(anotherUsername)
    if (!result) return

    let anotherUser = await UserModel.findByName(anotherUsername)!
    if (anotherUser.profile.relations.subscribers.includes(thisUsername)) {
      let sockets = clientServer.Aliases.get(thisUsername)
      if (sockets)
        clientServer
          .control(sockets)
          .emit('lost_friend', { username: anotherUsername })
      sockets = clientServer.Aliases.get(anotherUsername)
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
        .emit('unsubscribed', { username: anotherUsername })
    sockets = clientServer.Aliases.get(anotherUsername)
    if (sockets)
      return clientServer
        .control(sockets)
        .emit('lost_subscriber', { username: thisUsername })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('drop_relation error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('drop_relation error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('drop_relation error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('drop_relation', drop_relation)
