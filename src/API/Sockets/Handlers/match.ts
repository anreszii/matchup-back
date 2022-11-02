import * as MatchMaking from '../../../Classes/MatchMaking'
import { Match, Rating } from '../../../Interfaces/index'
import { PLAYERS } from '../../../Classes/MatchMaking/MemberManager'
import { CHATS, SearchEngine, TEAMS } from '../../../Classes'

import type { WebSocket } from 'uWebSockets.js'
import { clientServer } from '../clientSocketServer'
import { HANDLERS } from './dark-side'

import { DiscordClient } from '../../../Classes/Discord/Client'
import { validationCause, ValidationError } from '../../../error'

let dsClient = new DiscordClient(process.env.DISCORD_BOT_TOKEN!)

export const StandOffLobbies = new MatchMaking.LobbyManager(
  new MatchMaking.StandOffController(),
  dsClient,
)

const Searcher = new SearchEngine(StandOffLobbies)

setInterval(async () => {
  for (let lobby of StandOffLobbies.lobbies)
    if (!lobby.chat) await createChatForLobby(lobby.id)
}, 1000 * 3)

/**
 * Обработчик для поиска лобби.
 * @param params - ["region"]
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
  let Filters: Rating.SearchEngine.Filters
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  let region = params[0]
  if (typeof region != 'string' || !isCorrectRegion(region))
    throw new ValidationError('region', validationCause.INVALID)

  let team = member.teamID ? TEAMS.get(member.teamID) : undefined
  if (team) Filters = createFilterForTeamSearch(team, region)
  else Filters = createFiltersForSoloSearch(member, region)

  let lobby = await Searcher.findLobby(Filters)
  if (!lobby.region) lobby.region = region
  if (!lobby.chat) await createChatForLobby(lobby.id)

  await lobby.join(username)
  return clientServer.control(`lobby#${lobby.id}`).emit('find_lobby', {
    lobby_id: lobby.id,
    chat_id: lobby.chat!.id,
  })
}
HANDLERS.set('find_lobby', find_lobby)

/**
 * Обработчик для приглашения игрока в лобби.
 * @param params - ["userNameToInvite"]
 *
 * В случае успеха отправляет указанному пользователю ивент invite_to_lobby  с пакетом следующего вида:
 * ```ts
 * {
 *  lobbyID: string
 * }
 * ```
 * А вызвавшему пользователю отправляет тот же ивент с пакетом:
 * ```ts
 * {
 *  status: true
 * }
 * ```
 *
 * @category MatchMaking
 * @event
 */
export async function invite_to_lobby(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  if (!member.lobbyID)
    throw new ValidationError('lobby', validationCause.REQUIRED)

  let lobby = StandOffLobbies.get(member.lobbyID)
  if (!lobby) {
    member.lobbyID = undefined
    throw new ValidationError('lobby', validationCause.INVALID)
  }

  let invitedUser = params[1]
  if (!invitedUser)
    throw new ValidationError('username', validationCause.REQUIRED)
  if (typeof invitedUser != 'string')
    throw new ValidationError('username', validationCause.INVALID_FORMAT)

  let sockets = clientServer.Aliases.get(invitedUser)
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

  if (!(await lobby.join(socket.username))) return
  clientServer.control(socket.id).emit('sync_lobby', {
    status: lobby.status as string,
    players: JSON.stringify(lobby.members.players),
  })
}
HANDLERS.set('join_to_lobby', join_to_lobby)

/**
 * Обработчик для ручной синхронизации пользователя с лобби.</br>
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
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  if (!member.lobbyID)
    throw new ValidationError('lobby', validationCause.REQUIRED)

  let lobby = StandOffLobbies.get(member.lobbyID)
  if (!lobby) {
    member.lobbyID = undefined
    throw new ValidationError('lobby', validationCause.INVALID)
  }

  clientServer.control(socket.id).emit('sync_lobby', {
    status: lobby.status,
    players: JSON.stringify(lobby.members.players),
  })
}
HANDLERS.set('sync_lobby', sync_lobby)

/**
 * Обработчик для получения количества игроков, находящихся в лобби.</br>
 * @param params - ["myLobbyID"]
 *
 * В случае успеха создает ивент lobby_players_count и отправляет на него JSON объект:
 * ```ts
 * {
 *   lobby_id: string
 *   playersCount: number
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
    playersCount: lobby.members.playersCount,
  })
}
HANDLERS.set('get_lobby_players_count', get_lobby_players_count)

function isCorrectRegion(
  region: string,
): region is Rating.SearchEngine.SUPPORTED_REGIONS {
  if (region == 'Europe') return true
  if (region == 'Asia') return true
  return false
}

function createFilterForTeamSearch(
  team: Match.Member.Team.Instance,
  region: Rating.SearchEngine.SUPPORTED_REGIONS,
) {
  const Filters = Searcher.Filters
  Filters.byRegion(region)
  Filters.byGRI(team.GRI)
  Filters.byTeam(team.id)

  return Filters
}

function createFiltersForSoloSearch(
  member: Match.Member.Instance,
  region: Rating.SearchEngine.SUPPORTED_REGIONS,
) {
  const Filters = Searcher.Filters
  Filters.byRegion(region)
  Filters.byGRI(member.GRI)

  return Filters
}

async function createChatForLobby(lobbyID: string) {
  let lobby = StandOffLobbies.get(lobbyID)!
  lobby.chat = CHATS.spawn('gamesocket.io', `lobby#${lobbyID}`, {
    namespace: process.env.CLIENT_NAMESPACE!,
    room: `lobby#${lobbyID}`,
  })

  updateLobbyChatMembers(StandOffLobbies.get(lobbyID)!)
  return lobby.chat
}

async function updateLobbyChatMembers(lobby: Match.Lobby.Instance) {
  for (let member of lobby.members.values()) {
    lobby.chat!.addMember({ name: member.name }).then(async (status) => {
      if (status)
        await lobby.chat!.send({
          from: 'system',
          content: `member ${member.name} joined lobby#${lobby.id}`,
        })
    })
  }
}
