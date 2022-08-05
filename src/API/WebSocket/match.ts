import io from 'gamesocket.io'
import {
  matchCause,
  MatchError,
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../error'
import { StandOffController } from '../../MatchMaking/Controllers/StandOff'
import { LobbyManager, Member } from '../../MatchMaking/Lobby'
import { MemberList } from '../../MatchMaking/MemberListl'
import { validatePacket } from '../../Token'
import { WebSocketValidatior } from '../../validation/websocket'

let app = io()
let wsValidator = new WebSocketValidatior(app)

let clientServer = app.of('client')

clientServer.on('authorize', (escort) => {
  let token = validatePacket(escort)
  let socketID = escort.get('socket_id') as string

  wsValidator.authorizeSocket(socketID)
  let name = token.username as string

  app.aliases.set(name, socketID)
  return clientServer.control(socketID).emit('authorize', { complete: true })
})

clientServer.on('create match', async (escort) => {
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

    clientServer.control(socketID).emit('create match', { lobby_id: lobby.id })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('add member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add member', { reason: 'unknown error' })
    }
  }
})

clientServer.on('sync lobby', async (escort) => {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let lobbyID = escort.get('lobby_id')

    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

    clientServer.control(socketID).emit('sync lobby', {
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
          .emit('add member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add member', { reason: 'unknown error' })
    }
  }
})

clientServer.on('add member', async (escort) => {
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

    clientServer.control(socketID).emit('sync lobby', {
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
          .emit('add member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add member', { reason: 'unknown error' })
    }
  }
})

clientServer.on('remove member', async (escort) => {
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

    clientServer.control(socketID).emit('sync lobby', {
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
          .emit('add member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add member', { reason: 'unknown error' })
    }
  }
})

clientServer.on('change command', async (escort) => {
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

    let command = escort.get('command')
    if (!MemberList.isCommand(command))
      throw new ValidationError('command', validationCause.INVALID_FORMAT)
    let status = lobby.members.changeCommand(name, command)
    if (!status) throw new MatchError(lobbyID, matchCause.CHANGE_COMMAND)

    clientServer.control(socketID).emit('sync lobby', {
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
          .emit('add member error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('add member error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('add member', { reason: 'unknown error' })
    }
  }
})
