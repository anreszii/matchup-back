/**
 *
 * Для взаимодействия с клиентским сервером необходимо подключиться к ws://server.name:PORT/client
 * И передавать в пакете JSON объект, содержащий поле event, а также оговоренные в конкретном хэндлере поля
 *
 * В случае ошибок шлет на ${event} error объект JSON с полем reason
 * @module LobbyHandlers
 * @packageDocumentation
 */

import io from 'gamesocket.io'
import type { IDataEscort } from 'gamesocket.io/lib/DataManager/DataEscort/DataEscort'
import {
  matchCause,
  MatchError,
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../error'
import { StandOffController } from '../../MatchMaking/Controllers/StandOff'
import { LobbyManager } from '../../MatchMaking/Lobby'
import { MemberList } from '../../MatchMaking/MemberList'
import { validatePacket } from '../../Token'
import { WebSocketValidatior } from '../../validation/websocket'

let app = io()
let wsValidator = new WebSocketValidatior(app)

let clientServer = app.of('client')

/**
 * Событие для авторизации сокета. </br>
 * Используемый пакет:
 *
 * ```json
 * {
 *  "token": string //полученный при авторизации пользователя
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 *
 * ```json
 * {
 *  "complete": true
 * }
 * ```
 * @event authorize
 */
export function authorize(escort: IDataEscort) {
  let token = validatePacket(escort)
  let socketID = escort.get('socket_id') as string

  wsValidator.authorizeSocket(socketID)
  let name = token.username as string

  app.aliases.set(name, socketID)
  return clientServer.control(socketID).emit('authorize', { complete: true })
}

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

    let lobby = await LobbyManager.spawn(new StandOffController())

    let member = escort.get('member')
    if (member) {
      if (!MemberList.isMember(member))
        throw new ValidationError('member', validationCause.INVALID_FORMAT)
      await lobby.addMember(member)
    }

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
        .emit('add_member', { reason: 'unknown error' })
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

    let lobby = LobbyManager.get(lobbyID)
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
          .emit('add_member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add_member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add_member', { reason: 'unknown error' })
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

    let lobbyID = escort.get('lobby_id') as string
    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    let member = escort.get('member')
    if (!MemberList.isMember(member))
      throw new ValidationError('member', validationCause.INVALID_FORMAT)

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
        .emit('add_member', { reason: 'unknown error' })
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

    let lobby = LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    let name = escort.get('name')
    if (typeof name != 'string')
      throw new ValidationError('name', validationCause.REQUIRED)
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
        .emit('remove_member', { reason: 'unknown error' })
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
 *  "name": string //имя пользователя
 *  "readyFlag": boolean | undefined
 *  "command": 'spectator' | 'neutral' | 'command1' | 'command2'
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

    let lobbyID = escort.get('lobby_id') as string
    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)
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
        .emit('remove_member', { reason: 'unknown error' })
    }
  }
}

clientServer.on('authorize', authorize)
clientServer.on('create_match', createMatch)
clientServer.on('sync_lobby', syncLobby)
clientServer.on('add_member', addMember)
clientServer.on('remove_member', removeMember)

app.listen(Number(process.env.PORT), (ls) => {
  if (ls) console.log(`listening websockets on ${process.env.PORT}`)
})
