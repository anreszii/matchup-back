import { clientServer } from '../clientSocketServer'
import {
  matchCause,
  MatchError,
  MatchUpError,
  validationCause,
  ValidationError,
} from '../../../error'

import * as MatchMaking from '../../../Classes/MatchMaking'
import { ChatManager, MatchFinder } from '../../../Classes'
import { UserModel } from '../../../Models/index'
import { Match, Rating } from '../../../Interfaces/index'
import { DiscordClient } from '../../../Classes/Discord/Client'
import { HANDLERS } from './dark-side'
import { WebSocket } from 'uWebSockets.js'
let dsClient = new DiscordClient(process.env.DISCORD_BOT_TOKEN!)

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
 * Обработчик для поиска лобби.
 * @param params - ["region", "teamID"]
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
export async function find_lobby(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let Finder = new MatchFinder(StandOffLobbies)
  let region = params[0]
  if (typeof region != 'string' || !isCorrectRegion(region))
    throw new ValidationError('region', validationCause.INVALID)

  Finder.filterByRegion(region)
  let teamID = params[1]
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

  return clientServer.control(socket.id as string).emit('find_lobby', {
    lobby_id: lobby.id,
    chat_id: lobby.chat!.id,
  })
}
HANDLERS.set('find_lobby', find_lobby)

/**
 * Обработчик для приглашения игрока в лобби.
 * @param params - ["myLobbyID", "userNameToInvite"]
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
 *  "username": "invitedUserName"
 * }
 * ```
 *
 * @category MatchMaking
 * @event
 */
export async function invite_to_lobby(socket: WebSocket, params: unknown[]) {
  let lobbyID = params[0]
  if (!lobbyID) throw new ValidationError('lobbyID', validationCause.REQUIRED)
  if (typeof lobbyID != 'string')
    throw new ValidationError('lobbyID', validationCause.INVALID_FORMAT)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new ValidationError('lobbyID', validationCause.INVALID)

  let username = params[1]
  if (!username) throw new ValidationError('username', validationCause.REQUIRED)
  if (typeof username != 'string')
    throw new ValidationError('username', validationCause.INVALID_FORMAT)

  let sockets = clientServer.Aliases.get(username)
  if (!sockets) throw new ValidationError('username', validationCause.INVALID)

  clientServer
    .control(socket.id as string)
    .emit('invite_to_lobby', { status: true })
  clientServer.control(sockets).emit('invite_to_lobby', { lobbyID: lobby.id })
}
HANDLERS.set('invite_to_lobby', invite_to_lobby)

/**
 * Обработчик для вступления в лобби по ID.
 * @param params - ["myLobbyID"]
 *
 *
 * В случае успеха отправляет указанному пользователю ивент sync_lobby
 * @category MatchMaking
 * @event
 */
export async function join_to_lobby(socket: WebSocket, params: unknown[]) {
  let lobbyID = params[0]
  if (!lobbyID) throw new ValidationError('lobbyID', validationCause.REQUIRED)
  if (typeof lobbyID != 'string')
    throw new ValidationError('lobbyID', validationCause.INVALID_FORMAT)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new ValidationError('lobbyID', validationCause.INVALID)

  if (
    !(await lobby.addMember({
      name: socket.username,
      command: 'neutral',
      readyFlag: false,
    }))
  )
    return
  clientServer.control(socket.id).emit('sync_lobby', {
    status: lobby.status as string,
    players: JSON.stringify(lobby.members.players),
    spectators: JSON.stringify(lobby.members.spectators),
  })
}
HANDLERS.set('join_to_lobby', join_to_lobby)

/**
 * Обработчик для ручной синхронизации пользователя с лобби.</br>
 * @param params - ["myLobbyID"]
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
export async function sync_lobby(socket: WebSocket, params: unknown[]) {
  let lobbyID = params[0]
  if (typeof lobbyID != 'string')
    throw new ValidationError('lobby', validationCause.REQUIRED)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)
  updateLobbyChatMembers(lobby)

  clientServer.control(socket.id).emit('sync_lobby', {
    status: lobby.status as string,
    players: JSON.stringify(lobby.members.players),
    spectators: JSON.stringify(lobby.members.spectators),
  })
}
HANDLERS.set('sync_lobby', sync_lobby)

/**
 * Обработчик для получения количества игроков, находящихся в лобби.</br>
 * @param params - ["myLobbyID"]
 *
 * В случае успеха создает ивент lobby_players_count и отправляет на него JSON объект:
 * ```json
 * {
 *   "lobby_id": "string"
 *   "playersCount": 0
 * }
 * ```
 * @category MatchMaking
 * @event
 */
export async function get_lobby_players_count(
  socket: WebSocket,
  params: unknown[],
) {
  let lobbyID = params[0]
  if (typeof lobbyID != 'string')
    throw new ValidationError('lobby', validationCause.REQUIRED)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

  clientServer.control(socket.id).emit('lobby_players_count', {
    lobby_id: lobbyID,
    playersCount: lobby.members.quantityOfPlayers,
  })
}
HANDLERS.set('get_lobby_players_count', get_lobby_players_count)

/**
 * Событие для обновления статуса пользователя со стороны клиента.</br>
 * @param params - [
 * "myLobbyID: {string}",
 * "commandToJoin: {"spectator" | "neutral" | "command1" | "command2"}",
 * "readyFlag: {boolean}",
 * "teamID: {string | undefined}"
 * ]
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
export async function update_member(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let lobbyID = params[0]
  if (typeof lobbyID != 'string')
    throw new ValidationError('lobby', validationCause.REQUIRED)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new ValidationError('lobby', validationCause.NOT_EXIST)

  if (!lobby.members.hasMember(username))
    throw new ValidationError('member', validationCause.NOT_EXIST)

  let status = await lobby.updateMember({
    name: username,
    command: params[2] as string | undefined,
    readyFlag: params[3] as string | undefined,
    teamID: params[4] as string | undefined,
  })
  if (!status) throw new MatchError(lobbyID, matchCause.UPDATE_MEMBER)

  clientServer.control(socket.id).emit('sync_lobby', {
    status: lobby.status as string,
    players: JSON.stringify(lobby.members.players),
    spectators: JSON.stringify(lobby.members.spectators),
  })
}
HANDLERS.set('update_member', update_member)

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
