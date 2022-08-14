import { app } from './clientSocketServer'
import type { IDataEscort } from 'gamesocket.io/lib/DataManager/DataEscort/DataEscort'
import {
  matchCause,
  MatchError,
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../error'
import { WebSocketValidatior } from '../../validation'

import * as MatchMaking from '../../Classes/MatchMaking'

let clientServer = app.of('client')
let wsValidator = new WebSocketValidatior(app)
let MemberList = MatchMaking.MemberList

let StandOffLobbies = new MatchMaking.LobbyManager(
  new MatchMaking.StandOffController(),
)

/**
 * Событие для создания матча со стороны клиента.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "member": Member
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *  "lobby_id": string
 * }
 * ```
 * @event create_match
 */
export async function createMatch(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobby = StandOffLobbies.spawn()

    let member = escort.get('member')
    if (!member) throw new ValidationError('member', validationCause.REQUIRED)
    if (!MemberList.isMember(member))
      throw new ValidationError('member', validationCause.INVALID_FORMAT)

    await lobby.addMember(member)

    clientServer.control(socketID).emit('create_match', { lobby_id: lobby.id })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('add_member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add_member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add_member error', { reason: 'unknown error' })
    }
  }
}

/**
 * Событие для поиска матча со стороны клиента.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "member": Member
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *  "lobby_id": string
 * }
 * ```
 * @event find_match
 */
export async function findMatch(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobby = StandOffLobbies.getFreeLobby()

    let member = escort.get('member')
    if (!member) throw new ValidationError('member', validationCause.REQUIRED)
    if (!MemberList.isMember(member))
      throw new ValidationError('member', validationCause.INVALID_FORMAT)

    await lobby.addMember(member)
    clientServer.control(socketID).emit('find_match', { lobby_id: lobby.id })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('find_match error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('find_match error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('find_match error', { reason: 'unknown error' })
    }
  }
}

/**
 * Событие для ручной синхронизации пользователя с лобби.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "lobby_id": string //строка с id существующего лобби
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 *
 * ```json
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 *  spectators: Array<Member>
 * }
 * ```
 * @event sync_lobby
 */
export async function syncLobby(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobbyID = escort.get('lobby_id')

    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = MatchMaking.LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    clientServer.control(socketID).emit('sync_lobby', {
      status: lobby.status,
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

/**
 * Событие для добавления пользователя в лобби.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "lobby_id": string, //строка с id существующего лобби
 *  "member": Member
 * }
 * ```
 *
 * В случае успеха создает ивент sync_lobby и отправляет на него JSON объект:
 *
 * ```json
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 *  spectators: Array<Member>
 * }
 * ```
 * @event add_member
 */
export async function addMember(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let member = escort.get('member')
    if (!member) throw new ValidationError('member', validationCause.REQUIRED)
    if (!MemberList.isMember(member))
      throw new ValidationError('member', validationCause.INVALID_FORMAT)

    let lobbyID = escort.get('lobby_id') as string
    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = MatchMaking.LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    let status = await lobby.addMember(member)
    if (!status) throw new MatchError(lobbyID, matchCause.ADD_MEMBER)

    clientServer.control(socketID).emit('sync_lobby', {
      status: lobby.status,
      players: JSON.stringify(lobby.members.players),
      spectators: JSON.stringify(lobby.members.spectators),
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('add_member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add_member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add_member error', { reason: 'unknown error' })
    }
  }
}

/**
 * Событие для удаления пользователя из лобби.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "lobby_id": string, //строка с id существующего лобби
 *  "name": string //имя пользователя
 * }
 * ```
 *
 * В случае успеха создает ивент sync_lobby и отправляет на него JSON объект:
 *
 * ```json
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 *  spectators: Array<Member>
 * }
 * ```
 * @event remove_member
 */
export async function removeMember(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobbyID = escort.get('lobby_id') as string
    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let name = escort.get('name')
    if (typeof name != 'string')
      throw new ValidationError('name', validationCause.REQUIRED)

    let lobby = MatchMaking.LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)
    if (!lobby.members.hasMember(name))
      throw new ValidationError('name', validationCause.INVALID)

    let status = await lobby.removeMember(lobby.members.getMember(name)!)
    if (!status) throw new MatchError(lobbyID, matchCause.REMOVE_MEMBER)

    clientServer.control(socketID).emit('sync_lobby', {
      status: lobby.status,
      players: JSON.stringify(lobby.members.players),
      spectators: JSON.stringify(lobby.members.spectators),
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('remove_member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('remove_member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('remove_member error', { reason: 'unknown error' })
    }
  }
}

/**
 * Событие для обновления статуса пользователя со стороны клиента.</br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "lobby_id": string, //строка с id существующего лобби
 *  "member":
 *  {
 *    "name": string //имя пользователя
 *    "command": 'spectator' | 'neutral' | 'command1' | 'command2' | undefined
 *    "readyFlag": boolean | undefined
 *  }
 * }
 * ```
 *
 * В случае успеха создает ивент sync_lobby и отправляет на него JSON объект:
 *
 * ```json
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 *  spectators: Array<Member>
 * }
 * ```
 * @event update_member
 */
export async function updateMember(escort: IDataEscort) {
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

    let lobby = MatchMaking.LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    if (!lobby.members.hasMember(member.name))
      throw new ValidationError('member', validationCause.NOT_EXIST)

    let status = await lobby.updateMember({
      name: member.name,
      command: member.command,
      readyFlag: member.readyFlag,
    })
    if (!status) throw new MatchError(lobbyID, matchCause.UPDATE_MEMBER)

    clientServer.control(socketID).emit('sync_lobby', {
      status: lobby.status,
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
