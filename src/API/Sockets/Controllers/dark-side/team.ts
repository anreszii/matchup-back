import type { WebSocket } from 'uWebSockets.js'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { CONTROLLERS } from '../../Handlers/dark-side'
import { TEAMS } from '../../../../Classes/index'

/**
 * Обработчик для создания временной команды.</br>
 *
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
 *
 *
 * @returns
 * {
 *  "teamID": number
 *  "chat_id": string
 * }
 * @category Team
 * @event
 */
export async function create_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let team = await TEAMS.findByUserName(username)
  if (team) throw new TechnicalError('team', TechnicalCause.ALREADY_EXIST)

  team = TEAMS.spawn()
  await team.join(username)
  return {
    teamID: team.id,
    chatID: `team#${team.chat.id}`,
  }
}
CONTROLLERS.set('create_team', create_team)

/**
 * Обработчик для присоединения к команде.</br>
 * @param params - ["teamID: {string}"]
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
 *
 * @return ID чата команды в случае успешного подключения
 * @category Team
 * @event
 */
export async function join_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let teamID = params[0]
  if (!teamID) throw new TechnicalError('teamID', TechnicalCause.REQUIRED)
  if (typeof teamID != 'string')
    throw new TechnicalError('teamID', TechnicalCause.INVALID_FORMAT)

  let team = TEAMS.get(Number(teamID))
  if (!team) throw new TechnicalError('teamID', TechnicalCause.NOT_EXIST)

  await team.join(username)
  return `team#${team.chat.id}`
}
CONTROLLERS.set('join_team', join_team)

/**
 * Событие для выхода из команды.</br>
 *
 * @return true, если игрок успешно вышел из команды
 * @category Team
 * @event
 */
export async function leave_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let team = await TEAMS.findByUserName(username)
  if (!team) throw new TechnicalError('team', TechnicalCause.NOT_EXIST)
  if (!(await team.leave(username)))
    throw new TechnicalError('team member', TechnicalCause.CAN_NOT_DELETE)

  return true
}
CONTROLLERS.set('leave_team', leave_team)

/**
 * Событие для проверки членов команды, в которой состоит пользователь.</br>
 *
 * В случае возвращает объект:
 * ```ts
 * {
 *  members: Members[]
 *  captain: string
 *  GRI: number
 * }
 * ```
 * @category Team
 * @event
 */
export async function check_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string

  let team = await TEAMS.findByUserName(username)
  if (!team) throw new TechnicalError('team', TechnicalCause.NOT_EXIST)

  return {
    members: team.members.toArray,
    captain: team.captainName,
    GRI: team.GRI,
  }
}
CONTROLLERS.set('check_team', check_team)

/**
 * Контроллер для получения списка всех существующих комманд</br>
 *
 * @return массив ID комманд
 * @category Team
 * @event
 */
export async function get_teams(socket: WebSocket, params: unknown[]) {
  return TEAMS.IDs
}
CONTROLLERS.set('get_teams', get_teams)
