import type { WebSocket } from 'uWebSockets.js'
import { TEAMS } from '../../../../Classes/MatchMaking/Team/Manager'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { CONTROLLERS } from '../../Handlers/dark-side'
import { clientServer } from '../..'
import { UserModel } from '../../../../Models'
import { DTO } from '../../../../Classes/DTO/DTO'
import { PLAYERS } from '../../../../Classes/MatchMaking/Player/Manager'
import { PlayerSignals } from '../../../../Interfaces/MatchMaking/Player'

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
  let player = PLAYERS.get(username)
  if (!player) player = await PLAYERS.spawn(username)

  if (typeof player.PublicData.teamID == 'number') {
    if (!TEAMS.findById(player.PublicData.teamID)) {
      player.PublicData.teamID = undefined
      throw new TechnicalError('team', TechnicalCause.ALREADY_EXIST)
    }
  }

  return TEAMS.spawn()
    .then((team) => {
      team.join(username)
      return {
        teamID: team.id,
        chatID: team.chat.id,
      }
    })
    .catch((e) => {
      throw e
    })
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
  let player = PLAYERS.get(username)
  if (!player) throw new TechnicalError('player', TechnicalCause.NOT_EXIST)

  if (player.PublicData.teamID) {
    if (!TEAMS.findById(player.PublicData.teamID)) {
      player.event(PlayerSignals.corrupt)
      throw new TechnicalError('team', TechnicalCause.ALREADY_EXIST)
    }
  }

  let teamID = params[0]
  if (!teamID) throw new TechnicalError('teamID', TechnicalCause.REQUIRED)
  if (typeof teamID != 'string')
    throw new TechnicalError('teamID', TechnicalCause.INVALID_FORMAT)

  let team = TEAMS.findById(teamID)
  if (!team) throw new TechnicalError('teamID', TechnicalCause.NOT_EXIST)

  if (!(await team.join(username)))
    throw new TechnicalError('team member', TechnicalCause.CAN_NOT_ADD)

  const dto = new DTO({ name: username, label: 'join_team' })
  for (let member of team.players.values())
    clientServer
      .control(clientServer.Aliases.get(member.PublicData.name)!)
      .emit('team_join', dto.to.JSON)
  return team.chat.id
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
  let player = PLAYERS.get(username)
  if (!player) throw new TechnicalError('player', TechnicalCause.NOT_EXIST)

  if (!player.PublicData.teamID)
    throw new TechnicalError('team', TechnicalCause.NOT_EXIST)

  let team = TEAMS.findById(player.PublicData.teamID)
  if (!team) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('team', TechnicalCause.NOT_EXIST)
  }
  if (!(await team.leave(username)))
    throw new TechnicalError('team member', TechnicalCause.CAN_NOT_DELETE)

  const dto = new DTO({ name: username, label: 'leave_team' })
  for (let member of team.players.values())
    clientServer
      .control(clientServer.Aliases.get(member.PublicData.name)!)
      .emit('leave_team', dto.to.JSON)

  return true
}
CONTROLLERS.set('leave_team', leave_team)

/**
 * Событие для проверки команды, в которой состоит пользователь.</br>
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
  let player = PLAYERS.get(username)
  if (!player) throw new TechnicalError('player', TechnicalCause.NOT_EXIST)

  if (!player.PublicData.teamID)
    throw new TechnicalError('team', TechnicalCause.NOT_EXIST)

  let team = TEAMS.findById(player.PublicData.teamID)
  if (!team) {
    player.event(PlayerSignals.corrupt)

    throw new TechnicalError('team', TechnicalCause.NOT_EXIST)
  }

  return {
    id: team.id,
    members: team.playersData,
    captain: team.captainName,
    GRI: team.GRI,
  }
}
CONTROLLERS.set('check_team', check_team)

/**
 * Обработчик для приглашения игрока в лобби.
 * @param params - ["userNameToInvite"]
 *
 * В случае успеха отправляет указанному пользователю ивент invite  с пакетом следующего вида:
 * ```ts
 * {
 *  label: "team"
 *  teamID: string
 * }
 * ```
 * А вызвавшему пользователю отправляет тот же ивент с пакетом:
 * ```ts
 * {
 *  status: true
 * }
 * ```
 *
 * @category Team
 * @event
 */
export async function invite_to_team(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)
  if (!player) throw new TechnicalError('player', TechnicalCause.NOT_EXIST)

  if (!player.PublicData.teamID)
    throw new TechnicalError('team', TechnicalCause.NOT_EXIST)
  let team = TEAMS.get(player.PublicData.teamID)
  if (!team) {
    player.event(PlayerSignals.corrupt)

    throw new TechnicalError('team', TechnicalCause.NOT_EXIST)
  }

  let invitedUser = params[0]
  if (!invitedUser)
    throw new TechnicalError('username', TechnicalCause.REQUIRED)
  if (typeof invitedUser != 'string')
    throw new TechnicalError('username', TechnicalCause.INVALID_FORMAT)

  let sockets = clientServer.Aliases.get(invitedUser)
  if (!sockets)
    throw new TechnicalError('invited user', TechnicalCause.REQUIRED)

  UserModel.findByName(invitedUser).then((user) => {
    if (!user) return
    user.notify(`Вас приглашает в команду ${username}`)
  })

  const invite = new DTO({
    label: 'team',
    teamID: team.id,
    invitedBy: username,
  })
  clientServer.control(sockets).emit('invite', invite.to.JSON)
  return true
}
CONTROLLERS.set('invite_to_team', invite_to_team)

/**
 * Контроллер для получения списка всех существующих комманд</br>
 *
 * @return массив ID комманд
 * @category Team
 * @event
 */
export async function get_teams(socket: WebSocket, params: unknown[]) {
  return TEAMS.toArray
}
CONTROLLERS.set('get_teams', get_teams)
