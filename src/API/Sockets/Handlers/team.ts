import { clientServer } from '../clientSocketServer'
import {
  matchCause,
  MatchError,
  validationCause,
  ValidationError,
} from '../../../error'
import { UserModel } from '../../../Models/index'
import { HANDLERS } from './dark-side'
import { WebSocket } from 'uWebSockets.js'
import { Teams } from './match'

/**
 * Обработчик для создания временной команды.</br>
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *  "status": true
 *  "chat_id": "team#0000"
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
 * @category MatchMaking
 * @event
 */
export async function create_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let team = Teams.findByUserName(username)
  if (team) throw new ValidationError('team', validationCause.ALREADY_EXIST)

  team = Teams.spawn()
  await team.join(username)
  clientServer.control(socket.id).emit('join_team', {
    team_id: team.id,
    chat_id: `team#${team.chat.id}`,
  })
}
HANDLERS.set('create_team', create_team)

/**
 * Обработчик для присоединения к команде.</br>
 * @param params - ["teamID: {string}"]
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *  "status": true
 *  "chat_id": "team#0000"
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
 * @category MatchMaking
 * @event
 */
export async function join_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let teamID = params[0]
  if (!teamID) throw new ValidationError('team_id', validationCause.REQUIRED)
  if (!Teams.has(Number(teamID)))
    throw new ValidationError('team_id', validationCause.INVALID)

  let team = Teams.get(Number(teamID))!
  team.join(username)

  clientServer.control(socket.id).emit('join_team', {
    status: true,
    chat_id: `team#${team.chat.id}`,
  })
}
HANDLERS.set('join_team', join_team)

/**
 * Событие для выхода из команды.</br>
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  status: boolean
 * }
 * ```
 * @category MatchMaking
 * @event
 */
export async function leave_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let team = Teams.findByUserName(username)
  if (!team) throw new ValidationError('team', validationCause.NOT_EXIST)
  if (!(await team.leave(username)))
    throw new MatchError('team', matchCause.REMOVE_MEMBER)

  clientServer.control(socket.id).emit('leave_team', {
    status: true,
  })
}
HANDLERS.set('leave_team', leave_team)

/**
 * Событие для проверки членов команды, в которой состоит пользователь.</br>
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  members: Members[]
 * }
 * ```
 * @category MatchMaking
 * @event
 */
export async function check_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let team = Teams.findByUserName(username)
  if (!team) throw new ValidationError('team', validationCause.NOT_EXIST)

  clientServer
    .control(socket.id)
    .emit('check_team', JSON.stringify({ members: team.check() }))
}
HANDLERS.set('check_team', check_team)

/**
 * Событие для получения списка всех существующих комманд</br>
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  id_list: number[]
 * }
 * ```
 * @category MatchMaking
 * @event
 */
export async function get_teams(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  if (!(await UserModel.findByName(username)))
    throw new ValidationError('user', validationCause.INVALID)

  clientServer
    .control(socket.id)
    .emit('load_teams', JSON.stringify({ id_list: Teams.IDs }))
}
HANDLERS.set('get_teams', get_teams)
