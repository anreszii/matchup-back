import { WebSocket } from 'uWebSockets.js'
import { PLAYERS } from '../../../../Classes/MatchMaking/Player/Manager'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { StandOff_Lobbies } from '../../../../Classes/MatchMaking/Lobby/Manager'
import { UserModel } from '../../../../Models'
import { Match } from '../../../../Interfaces'
import { PlayerSignals } from '../../../../Interfaces/MatchMaking/Player'
import { CONTROLLERS } from '../..'

export async function lobby_fullfill(socket: WebSocket, params: unknown[]) {
  try {
    const [_, lobby] = get_name_and_lobby_from_socket(socket)
    let test_users = await UserModel.getTestData(lobby.GRI)
    const promises = []
    for (let user of test_users)
      promises.push(PLAYERS.spawn(user.profile.username))
    await Promise.all(promises)

    for (let user of test_users) lobby.join(user.profile.username)
  } catch (e) {
    throw e
  }
}
CONTROLLERS.set('test/lobby_fullfill', lobby_fullfill)

export async function lobby_get_ready(socket: WebSocket, params: unknown[]) {
  try {
    const [_, lobby] = get_name_and_lobby_from_socket(socket)
    for (let [_, player] of lobby.players) player.event(PlayerSignals.be_ready)
  } catch (e) {
    throw e
  }
}
CONTROLLERS.set('test/lobby_get_ready', lobby_get_ready)

export async function lobby_leave(socket: WebSocket, params: unknown[]) {
  try {
    const [_, lobby] = get_name_and_lobby_from_socket(socket)
    for (let [_, player] of lobby.players) lobby.leave(player.PublicData.name)
  } catch (e) {
    throw e
  }
}
CONTROLLERS.set('test/lobby_leave', lobby_leave)

export async function lobby_delete(socket: WebSocket, params: unknown[]) {
  try {
    const [_, lobby] = get_name_and_lobby_from_socket(socket)
    lobby.delete()
  } catch (e) {
    throw e
  }
}
CONTROLLERS.set('test/lobby_delete', lobby_delete)

export async function notify(socket: WebSocket, params: unknown[]) {
  const username = socket.username
  let ms = 0
  if (typeof params[0] == 'number' && params[0] >= 0) ms = params[0]
  setTimeout(() => {
    PLAYERS.get(username)?.notify('test notification')
  }, ms)
  return true
}
CONTROLLERS.set('test/notify', notify)

function get_name_and_lobby_from_socket(
  socket: WebSocket,
): [string, Match.Lobby.Instance] | never {
  const username = socket.username
  const player = PLAYERS.get(username)
  if (!player?.PublicData.lobbyID)
    throw new TechnicalError('lobby ID', TechnicalCause.INVALID_FORMAT)
  const lobby = StandOff_Lobbies.get(player.PublicData.lobbyID)
  if (!lobby) throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)

  return [username, lobby]
}
