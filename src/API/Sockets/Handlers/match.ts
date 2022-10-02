import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import type { IDataEscort } from 'gamesocket.io'
import {
  matchCause,
  MatchError,
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../../error'
import { WebSocketValidatior } from '../../../validation'

import * as MatchMaking from '../../../Classes/MatchMaking'
import { ChatManager, MatchFinder } from '../../../Classes'
import { UserModel } from '../../../Models/index'
import { Match, Rating } from '../../../Interfaces/index'
import { DiscordClient } from '../../../Classes/Discord/Client'
let dsClient = new DiscordClient(process.env.DISCORD_BOT_TOKEN!)
let wsValidator = new WebSocketValidatior(WS_SERVER)

const Teams = new MatchMaking.TeamManager()
export const StandOffLobbies = new MatchMaking.LobbyManager(
  new MatchMaking.StandOffController(),
  dsClient,
)

const chats = new ChatManager()

setInterval(async () => {
  for (let lobby of StandOffLobbies.lobbies)
    if (!lobby.chat) await createChatForLobby(lobby.id)
}, 1000 * 3)

/**
 * Событие для поиска матча со стороны клиента.</br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *  region: 'Europe' | 'Asia'
 *  teamID?: number
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект(если в команде, то данный ивент придет всем игрокам команды):
 * ```ts
 * {
 *  lobby_id: string
 *  chat_id: string
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
export async function find_lobby(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    if (!(await UserModel.findByName(username)))
      throw new ValidationError('user', validationCause.INVALID)

    let Finder = new MatchFinder(StandOffLobbies)
    let region = escort.get('region')
    if (typeof region != 'string' || !isCorrectRegion(region))
      throw new ValidationError('region', validationCause.INVALID)

    Finder.filterByRegion(region)
    let teamID = escort.get('team_id')
    if (teamID && Teams.has(Number(teamID))) {
      let team = Teams.get(Number(teamID))!
      Finder.filterByGRI(team.GRI)
      Finder.filterByTeamSize(team.membersCount)
      let lobby = await Finder.findLobby()

      if (!lobby.region) lobby.region = region
      if (!lobby.chat) await createChatForLobby(lobby.id)

      for (let member of team.check()) await lobby.addMember(member)
      return clientServer.control(`lobby#${lobby.id}`).emit('find_lobby', {
        lobby_id: lobby.id,
        chat_id: lobby.chat!.id,
      })
    }

    Finder.filterByTeamSize(1)
    Finder.filterByGRI(await UserModel.getGRI(username))

    let lobby = await Finder.findLobby()

    if (!lobby.region) lobby.region = region
    if (!lobby.chat) await createChatForLobby(lobby.id)

    await lobby.addMember({
      name: username,
      readyFlag: false,
      command: 'neutral',
    })

    return clientServer.control(socketID).emit('find_lobby', {
      lobby_id: lobby.id,
      chat_id: lobby.chat!.id,
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('find_lobby error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('find_lobby error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('find_lobby error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('find_lobby', find_lobby)

/**
 * Событие для приглашения другого игрока в лобби.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "username": "anyUserNameToInvite"
 *  "lobbyID": "myLobby"
 * }
 * ```
 *
 * В случае успеха отправляет указанному пользователю ивент invite_to_lobby  с пакетом следующего вида:
 * ```json
 * {
 *  "lobbyID": "lobby"
 * }
 * ```
 * А вызвавшему пользователю отправляет тот же ивент с пакетом:
 * ```json
 * {
 *  status: true
 * }
 * ```
 *
 * @category MatchMaking
 * @event
 */
export async function invite_to_lobby(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobbyID = escort.get('lobbyID')
    if (!lobbyID) throw new ValidationError('lobbyID', validationCause.REQUIRED)
    if (typeof lobbyID != 'string')
      throw new ValidationError('lobbyID', validationCause.INVALID_FORMAT)

    let lobby = StandOffLobbies.get(lobbyID)
    if (!lobby) throw new ValidationError('lobbyID', validationCause.INVALID)

    let username = escort.get('username')
    if (!username)
      throw new ValidationError('username', validationCause.REQUIRED)
    if (typeof username != 'string')
      throw new ValidationError('username', validationCause.INVALID_FORMAT)

    let sockets = clientServer.Aliases.get(username)
    if (!sockets) throw new ValidationError('username', validationCause.INVALID)

    clientServer.control(socketID).emit('invite_to_lobby', { status: true })
    clientServer.control(sockets).emit('invite_to_lobby', { lobbyID: lobby.id })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('invite_to_lobby error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('invite_to_lobby error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('invite_to_lobby error', { reason: 'unknown error' })
    }
  }
}

/**
 * Событие для вступления лобби по ID.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "lobbyID": "lobbyIdToJoin"
 * }
 * ```
 *
 * В случае успеха отправляет указанному пользователю ивент sync_lobby
 *
 * @category MatchMaking
 * @event
 */
export async function join_to_lobby(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    if (!(await UserModel.findByName(username)))
      throw new ValidationError('user', validationCause.INVALID)

    let lobbyID = escort.get('lobbyID')
    if (!lobbyID) throw new ValidationError('lobbyID', validationCause.REQUIRED)
    if (typeof lobbyID != 'string')
      throw new ValidationError('lobbyID', validationCause.INVALID_FORMAT)

    let lobby = StandOffLobbies.get(lobbyID)
    if (!lobby) throw new ValidationError('lobbyID', validationCause.INVALID)

    if (
      !(await lobby.addMember({
        name: username,
        command: 'neutral',
        readyFlag: false,
      }))
    )
      return
    clientServer.control(socketID).emit('sync_lobby', {
      status: lobby.status as string,
      players: JSON.stringify(lobby.members.players),
      spectators: JSON.stringify(lobby.members.spectators),
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('join_to_lobby error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('join_to_lobby error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('join_to_lobby error', { reason: 'unknown error' })
    }
  }
}

/**
 * Событие для ручной синхронизации пользователя с лобби.</br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *  lobby_id: string //строка с id существующего лобби
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 *
 * ```ts
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 *  spectators: Array<Member>
 * }
 * ```
 * @category MatchMaking
 * @event
 */
export async function sync_lobby(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobbyID = escort.get('lobby_id')

    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = StandOffLobbies.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)
    updateLobbyChatMembers(lobby)

    clientServer.control(socketID).emit('sync_lobby', {
      status: lobby.status as string,
      players: JSON.stringify(lobby.members.players),
      spectators: JSON.stringify(lobby.members.spectators),
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('sync_lobby error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('sync_lobby error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('sync_lobby error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('sync_lobby', sync_lobby)

/**
 * Событие для получения количества игроков, находящихся в лобби.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "lobby_id": "string" //строка с id существующего лобби
 * }
 * ```
 *
 * В случае успеха создает ивент lobby_players_count и отправляет на него JSON объект:
 *
 * ```json
 * {
 *   "lobby_id": "string"
 *   "playersCount": 0
 * }
 * ```
 * @category MatchMaking
 * @event
 */
export async function get_lobby_players_count(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobbyID = escort.get('lobby_id')

    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = StandOffLobbies.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    clientServer.control(socketID).emit('lobby_players_count', {
      lobby_id: lobbyID,
      playersCount: lobby.members.quantityOfPlayers,
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('get_lobby_players error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('get_lobby_players_count error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('get_lobby_players_count error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('get_lobby_players_count', get_lobby_players_count)

/**
 * Событие для обновления статуса пользователя со стороны клиента.</br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *  lobby_id: string, //строка с id существующего лобби
 *  command: 'spectator' | 'neutral' | 'command1' | 'command2' | undefined
 *  readyFlag: boolean | undefined
 *  teamID?: number
 * }
 * ```
 *
 * В случае успеха создает ивент sync_lobby и отправляет на него JSON объект:
 *
 * ```ts
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 *  spectators: Array<Member>
 * }
 * ```
 * @category MatchMaking
 * @event
 */
export async function update_member(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let member = escort.get('member')
    if (!member || typeof member != 'object')
      throw new ValidationError('member', validationCause.REQUIRED)
    if (typeof member.name != 'string')
      throw new ValidationError('member.name', validationCause.REQUIRED)

    let lobbyID = escort.get('lobby_id') as string
    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = StandOffLobbies.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    if (!lobby.members.hasMember(member.name))
      throw new ValidationError('member', validationCause.NOT_EXIST)

    let status = await lobby.updateMember({
      name: member.name,
      command: member.command as string | undefined,
      readyFlag: member.readyFlag as string | undefined,
    })
    if (!status) throw new MatchError(lobbyID, matchCause.UPDATE_MEMBER)

    clientServer.control(socketID).emit('sync_lobby', {
      status: lobby.status as string,
      players: JSON.stringify(lobby.members.players),
      spectators: JSON.stringify(lobby.members.spectators),
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('update_member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('update_member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('update_member error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('update_member', update_member)

/**
 * Событие для создания к команде.</br>
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  status: boolean
 *  chat_id?: team#number
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
export async function create_team(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    if (!(await UserModel.findByName(username)))
      throw new ValidationError('user', validationCause.INVALID)

    let team = Teams.findByUserName(username)
    if (team) throw new ValidationError('team', validationCause.ALREADY_EXIST)

    team = Teams.spawn()
    await team.join(username)
    clientServer.control(escort.get('socket_id')! as string).emit('join_team', {
      team_id: team.id,
      chat_id: `team#${team.chat.id}`,
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('create_team error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('create_team error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('create_team error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('create_team', create_team)

/**
 * Событие для присоединения к команде.</br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *  team_id: string
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *  status: boolean
 *  chat_id?: team#number
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
export async function join_team(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    if (!(await UserModel.findByName(username)))
      throw new ValidationError('user', validationCause.INVALID)

    let teamID = escort.get('team_id')
    if (!teamID) throw new ValidationError('team_id', validationCause.REQUIRED)
    if (!Teams.has(Number(teamID)))
      throw new ValidationError('team_id', validationCause.INVALID)

    let team = Teams.get(Number(teamID))!
    team.join(username)

    clientServer.control(escort.get('socket_id')! as string).emit('join_team', {
      status: true,
      chat_id: `team#${team.chat.id}`,
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('join_team error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('join_team error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('join_team error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('join_team', join_team)

/**
 * Событие для выхода из команды.</br>
 * Используемый пакет:
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
export async function leave_team(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    if (!(await UserModel.findByName(username)))
      throw new ValidationError('user', validationCause.INVALID)

    let team = Teams.findByUserName(username)
    if (!team) throw new ValidationError('team', validationCause.NOT_EXIST)
    if (!(await team.leave(username)))
      throw new MatchError('team', matchCause.REMOVE_MEMBER)

    clientServer
      .control(escort.get('socket_id')! as string)
      .emit('leave_team', {
        status: true,
      })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('leave_team error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('leave_team error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('leave_team error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('leave_team', leave_team)

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
export async function check_team(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    if (!(await UserModel.findByName(username)))
      throw new ValidationError('user', validationCause.INVALID)

    let team = Teams.findByUserName(username)
    if (!team) throw new ValidationError('team', validationCause.NOT_EXIST)

    clientServer
      .control(socketID)
      .emit('check_team', JSON.stringify({ members: team.check() }))
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('check_team error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('check_team error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('check_team error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('check_team', check_team)

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
export async function load_teams(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    if (!(await UserModel.findByName(username)))
      throw new ValidationError('user', validationCause.INVALID)

    clientServer
      .control(socketID)
      .emit('load_teams', JSON.stringify({ id_list: Teams.IDs }))
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('check_team error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('check_team error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('check_team error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('load_teams', load_teams)

function isCorrectRegion(
  region: string,
): region is Rating.SearchEngine.SUPPORTED_REGIONS {
  if (region == 'Europe') return true
  if (region == 'Asia') return true
  return false
}

async function createChatForLobby(lobbyID: string) {
  let lobby = StandOffLobbies.get(lobbyID)!
  lobby.chat = chats.spawn('gamesocket.io', `lobby#${lobbyID}`, {
    namespace: process.env.CLIENT_NAMESPACE!,
    room: `lobby#${lobbyID}`,
  })

  updateLobbyChatMembers(StandOffLobbies.get(lobbyID)!)
  return lobby.chat
}

async function updateLobbyChatMembers(lobby: Match.Lobby.Instance) {
  for (let member of lobby.members.values()) {
    await lobby.chat!.addMember({ name: member.name, role: 'user' })
    await lobby.chat!.send(
      JSON.stringify({
        from: 'system',
        message: `member ${member.name} joined lobby#${lobby.id}`,
      }),
    )
  }
}
