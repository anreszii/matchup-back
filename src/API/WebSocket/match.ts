import io from 'gamesocket.io'
import {
  matchCause,
  MatchError,
  validationCause,
  ValidationError,
} from '../../error'
import { StandOffController } from '../../MatchMaking/Controllers/StandOff'
import { LobbyManager, Member } from '../../MatchMaking/Lobby'
import { MemberList } from '../../MatchMaking/MemberListl'
import { validatePacket } from '../../Token'

let Server = io()

let clientServer = Server.of('client')

clientServer.on('authorize', (escort) => {
  let token = validatePacket(escort)

  let name = token.username as string
  let socketID = escort.get('id') as string

  Server.aliases.set(name, socketID)
  return clientServer.control(socketID).emit('authorize', { complete: true })
})

clientServer.on('sync lobby', async (escort) => {
  try {
    let token = validatePacket(escort)

    let socketID = escort.get('id') as string
    let lobbyID = escort.get('lobby_id')

    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.INVALID)

    clientServer.control(socketID).emit('sync lobby', {
      status: lobby.status,
      players: lobby.members.players,
      spectators: lobby.members.spectators,
    })
  } catch (e) {
    let socketID = escort.get('id') as string
    if (e instanceof Error) {
      if (e instanceof ValidationError || e instanceof MatchError)
        return clientServer
          .control(socketID)
          .emit('sync lobby error', { reason: e.genericMessage })

      return clientServer
        .control(socketID)
        .emit('sync lobby error', { reason: e.message })
    }

    clientServer
      .control(escort.get('id') as string)
      .emit('sync lobby error', { reason: 'unknwon error' })
  }
})

clientServer.on('create match', async (escort) => {
  try {
    let token = validatePacket(escort)

    let socketID = escort.get('id') as string
    let lobby = LobbyManager.spawn(new StandOffController())

    let member = escort.get('member')
    if (member) {
      if (!MemberList.isMember(member))
        throw new ValidationError('member', validationCause.INVALID_FORMAT)
      await lobby.addMember(member)
    }

    clientServer.control(socketID).emit('create match', { lobbyID: lobby.id })
  } catch (e) {
    let socketID = escort.get('id') as string
    if (e instanceof Error) {
      if (e instanceof ValidationError || e instanceof MatchError)
        return clientServer
          .control(socketID)
          .emit('add member error', { reason: e.genericMessage })

      return clientServer
        .control(socketID)
        .emit('add member error', { reason: e.message })
    }

    clientServer
      .control(escort.get('id') as string)
      .emit('add member', { reason: 'unknwon error' })
  }
})

clientServer.on('add member', async (escort) => {
  try {
    let token = validatePacket(escort)

    let socketID = escort.get('id') as string
    let lobbyID = escort.get('lobby_id')

    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.INVALID)

    let status = await lobby.addMember({
      name: token.username as string,
      command: 'neutral',
      readyFlag: false,
    })

    if (!status) throw new MatchError(lobbyID, matchCause.ADD_MEMBER)

    return clientServer.control(socketID).emit('add member', {
      lobbyID: lobby.id,
      command: 'neutral',
      readyFlag: false,
    })
  } catch (e) {
    let socketID = escort.get('id') as string
    if (e instanceof Error) {
      if (e instanceof ValidationError || e instanceof MatchError)
        return clientServer
          .control(socketID)
          .emit('add member error', { reason: e.genericMessage })

      return clientServer
        .control(socketID)
        .emit('add member error', { reason: e.message })
    }

    clientServer
      .control(escort.get('id') as string)
      .emit('add member', { reason: 'unknwon error' })
  }
})

clientServer.on('remove member', async (escort) => {
  try {
    let token = validatePacket(escort)

    let socketID = escort.get('id') as string
    let lobbyID = escort.get('lobby_id')

    if (typeof lobbyID != 'string')
      throw new ValidationError('lobby', validationCause.REQUIRED)

    let lobby = LobbyManager.get(lobbyID)
    if (!lobby) throw new ValidationError('lobby', validationCause.INVALID)

    let status = await lobby.removeMember(escort.get('member') as Member)

    if (!status) throw new MatchError(lobbyID, matchCause.REMOVE_MEMBER)

    return clientServer.control(socketID).emit('remove member', {
      lobbyID: lobby.id,
      command: 'neutral',
      readyFlag: false,
    })
  } catch (e) {
    let socketID = escort.get('id') as string
    if (e instanceof Error) {
      if (e instanceof ValidationError || e instanceof MatchError)
        return clientServer
          .control(socketID)
          .emit('remove member error', { reason: e.genericMessage })

      return clientServer
        .control(socketID)
        .emit('remove member error', { reason: e.message })
    }

    clientServer
      .control(escort.get('id') as string)
      .emit('remove member error', { reason: 'unknwon error' })
  }
})
