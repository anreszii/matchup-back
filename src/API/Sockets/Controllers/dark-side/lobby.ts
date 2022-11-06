import type { WebSocket } from 'uWebSockets.js'

import * as MatchMaking from '../../../../Classes/MatchMaking'
import { Match, Rating } from '../../../../Interfaces/index'
import { PLAYERS } from '../../../../Classes/MatchMaking/MemberManager'
import { CHATS, isCorrectType, SearchEngine, TEAMS } from '../../../../Classes'

import { clientServer } from '../../clientSocketServer'
import { CONTROLLERS as CONTROLLERS } from '../../Handlers/dark-side'

import { DiscordClient } from '../../../../Classes/Discord/Client'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { DTO } from '../../../../Classes/DTO/DTO'
import { isCorrectCommand } from '../../../../Classes/MatchMaking/Command/Command'
import { COMMANDS } from '../../../../Classes/MatchMaking/Command/Manager'

let dsClient = new DiscordClient(process.env.DISCORD_BOT_TOKEN!)

export const StandOffLobbies = new MatchMaking.LobbyManager(
  new MatchMaking.StandOffController(),
  dsClient,
)

const Searcher = new SearchEngine(StandOffLobbies)

setInterval(async () => {
  for (let lobby of StandOffLobbies.lobbies) {
    if (!lobby.chat) await createChatForLobby(lobby.id)
    if (lobby.status == 'filled' && !lobby.isReady) sendReadyIventToLobby(lobby)
  }
}, 1000 * 3)

/**
 * Обработчик для поиска лобби.
 * @param params - ["region", "matchType"]
 * 
 * matchType может быть следующего вида:
 * 
 * - training
 * - arcade
 * - rating
 * 
 * В случае успеха возвращает объект формата:
 * ```ts
 * {
 *  lobbyID: string
 *  chatID: string
 * }
 * ```
 * Все события из чата матча будут приходить на event chat в формате:
 *
 
 * ```json
 * {
 *  "chat":"lobby#xxxx",
 *  "message": 
 *  {
 *    "from": "system or username",
 *    "message": "text of message"
 *  }
 * }
 * ```
 * @category Lobby
 * @event
 */
export async function find_lobby(socket: WebSocket, params: unknown[]) {
  let Filters: Rating.SearchEngine.Filters
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  let region = params[0]
  if (typeof region != 'string' || !isCorrectRegion(region))
    throw new TechnicalError('region', TechnicalCause.INVALID_FORMAT)

  let team = member.teamID ? TEAMS.get(member.teamID) : undefined
  if (team) {
    if (team.captainName != username)
      throw new TechnicalError('team captain', TechnicalCause.REQUIRED)
    Filters = createFilterForTeamSearch(team, region)
  } else Filters = createFiltersForSoloSearch(member, region)

  let type = params[1]
  if (isCorrectType(type)) {
    Filters.byRegime(type)
  }

  let lobby = await Searcher.findLobby(Filters)
  if (!lobby.region) lobby.region = region
  if (!lobby.chat) await createChatForLobby(lobby.id)

  await lobby.join(username)
  return {
    lobbyID: lobby.id,
    chatID: lobby.chat!.id,
  }
}
CONTROLLERS.set('find_lobby', find_lobby)

/**
 * Контроллер для получения текущего количества лобби.</br>
 *
 * @category Lobby
 * @event
 */
export async function ready(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  if (!member.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOffLobbies.get(member.lobbyID)
  if (!lobby) {
    member.lobbyID = undefined
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  if (!lobby.becomeReady(username))
    throw new TechnicalError('member lobby', TechnicalCause.CAN_NOT_UPDATE)
  return true
}
CONTROLLERS.set('get_ready', ready)

/**
 * Контроллер для смены команды.</br>
 * @param params - ["commandType"]
 * - commandType может принимать значения "spectators", "neutrals", "command1", "command2"
 *
 * @category Lobby
 * @event
 */
export async function changeCommand(socket: WebSocket, params: unknown[]) {
  let command = params[0]
  if (!isCorrectCommand(command))
    throw new TechnicalError('command', TechnicalCause.INVALID_FORMAT)
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  if (!member.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOffLobbies.get(member.lobbyID)
  if (!lobby) {
    member.lobbyID = undefined
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  if (!(await lobby.move(username, command)))
    throw new TechnicalError('member command', TechnicalCause.CAN_NOT_UPDATE)
  return true
}
CONTROLLERS.set('change_command', changeCommand)

/**
 * Контроллер для получения текущего капитана.</br>
 * @returns имя капитана команды игрока
 * @category Lobby
 * @event
 */
export async function getCaptain(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  if (!member.commandID)
    throw new TechnicalError('command', TechnicalCause.REQUIRED)

  let command = COMMANDS.get(member.commandID)
  if (!command) {
    member.commandID = undefined
    throw new TechnicalError('command', TechnicalCause.NOT_EXIST)
  }

  return command.captain
}
CONTROLLERS.set('get_captain', getCaptain)

/**
 * Обработчик для приглашения игрока в лобби.
 * @param params - ["userNameToInvite"]
 *
 * В случае успеха отправляет указанному пользователю ивент invite  с пакетом следующего вида:
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
 * @category Lobby
 * @event
 */
export async function invite_to_lobby(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  if (!member.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOffLobbies.get(member.lobbyID)
  if (!lobby) {
    member.lobbyID = undefined
    throw new TechnicalError('lobby', TechnicalCause.INVALID)
  }

  let invitedUser = params[1]
  if (!invitedUser)
    throw new TechnicalError('username', TechnicalCause.REQUIRED)
  if (typeof invitedUser != 'string')
    throw new TechnicalError('username', TechnicalCause.INVALID_FORMAT)

  let sockets = clientServer.Aliases.get(invitedUser)
  if (!sockets) throw new TechnicalError('username', TechnicalCause.INVALID)

  const invite = new DTO({ label: 'invite', lobbyID: lobby.id })
  clientServer.control(sockets).emit('invite', invite.to.JSON)
  return true
}
CONTROLLERS.set('invite_to_lobby', invite_to_lobby)

/**
 * Контроллер для вступления в лобби по ID.
 * @param params - ["myLobbyID"]
 * В случае успеха возвращает объект формата:
 *
 * ```ts
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 * }
 * ```
 * @category Lobby
 * @event
 */
export async function join_to_lobby(socket: WebSocket, params: unknown[]) {
  let lobbyID = params[0]
  if (!lobbyID) throw new TechnicalError('lobbyID', TechnicalCause.REQUIRED)
  if (typeof lobbyID != 'string')
    throw new TechnicalError('lobbyID', TechnicalCause.INVALID_FORMAT)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new TechnicalError('lobbyID', TechnicalCause.NOT_EXIST)

  if (!(await lobby.join(socket.username))) return
  return {
    status: lobby.status,
    players: lobby.players,
  }
}
CONTROLLERS.set('join_to_lobby', join_to_lobby)

/**
 * Контроллер для ручной синхронизации пользователя с лобби.</br>
 * В случае успеха возвращает объект формата:
 *
 * ```ts
 * {
 *  status: 'searching' | 'filled' | 'started',
 *  players: Array<Member>,
 * }
 * ```
 * @category Lobby
 * @event
 */
export async function sync_lobby(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let member = await PLAYERS.get(username)

  if (!member.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOffLobbies.get(member.lobbyID)
  if (!lobby) {
    member.lobbyID = undefined
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  return {
    status: lobby.status,
    players: lobby.players,
  }
}
CONTROLLERS.set('sync_lobby', sync_lobby)

/**
 * Контроллер для получения количества игроков, находящихся в лобби.</br>
 * @param params - ["myLobbyID"]
 *
 * В случае успеха возвращает количество игроков в лобби
 * @category Lobby
 * @event
 */
export async function get_lobby_players_count(
  socket: WebSocket,
  params: unknown[],
) {
  let lobbyID = params[0]
  if (!lobbyID) throw new TechnicalError('lobbyID', TechnicalCause.REQUIRED)
  if (typeof lobbyID != 'string')
    throw new TechnicalError('lobbyID', TechnicalCause.INVALID_FORMAT)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)

  return lobby.playersCount
}
CONTROLLERS.set('get_lobby_players_count', get_lobby_players_count)

/**
 * Контроллер для получения текущего количества лобби.</br>
 *
 * В случае успеха возвращает количество текущих лобби
 * @category Lobby
 * @event
 */
export async function get_lobby_count(socket: WebSocket, params: unknown[]) {
  let lobbyID = params[0]
  if (!lobbyID) throw new TechnicalError('lobbyID', TechnicalCause.REQUIRED)
  if (typeof lobbyID != 'string')
    throw new TechnicalError('lobbyID', TechnicalCause.INVALID_FORMAT)

  let lobby = StandOffLobbies.get(lobbyID)
  if (!lobby) throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)

  return StandOffLobbies.lobbies.length
}
CONTROLLERS.set('get_lobby_count', get_lobby_count)

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
  if (team.isGuild) Filters.byGuild()

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

function sendReadyIventToLobby(lobby: Match.Lobby.Instance) {
  for (let member of lobby.players) {
    let dto = new DTO({ label: 'ready', lobby: lobby.id })
    clientServer
      .control(clientServer.Aliases.get(member.name)!)
      .emit('ready', dto.to.JSON)
  }
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
