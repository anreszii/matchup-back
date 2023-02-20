import type { WebSocket } from 'uWebSockets.js'
import { Match, Rating } from '../../../../Interfaces/index'

import { clientServer } from '../../clientSocketServer'

import { DTO } from '../../../../Classes/DTO/DTO'
import { TechnicalCause, TechnicalError } from '../../../../error'

import { CONTROLLERS as CONTROLLERS } from '../../Handlers/dark-side'

import { SearchEngine } from '../../../../Classes/MatchMaking/Rating/SearchEngine'
import { isCorrectType } from '../../../../Classes/MatchMaking/Lobby/Lobby'
import { TEAMS } from '../../../../Classes/MatchMaking/Team/Manager'
import { PLAYERS } from '../../../../Classes/MatchMaking/Player/Manager'
import { isCorrectCommand } from '../../../../Classes/MatchMaking/Command/Command'
import { UserModel } from '../../../../Models/index'
import { HOUR_IN_MS, SECOND_IN_MS } from '../../../../configs/time_constants'
import {
  CachedLobbies,
  CachedMember,
} from '../../../../Classes/MatchMaking/LobbyCache'
import { PlayerSignals } from '../../../../Interfaces/MatchMaking/Player'
import { StandOff_Lobbies } from '../../../../Classes/MatchMaking/Lobby/Manager'

const Searcher = new SearchEngine(StandOff_Lobbies)

setInterval(function () {
  try {
    for (let lobby of StandOff_Lobbies.lobbies) {
      lobby.updateState()
      switch (lobby.state) {
        case Match.Lobby.States.searching:
          sendSyncIventToLobby(lobby)
          break
        case Match.Lobby.States.filled:
          sendReadyIventToLobby(lobby)
          break
        case Match.Lobby.States.voting:
          sendVoteIventToLobby(lobby)
          break
        case Match.Lobby.States.preparing:
          switch (lobby.readyToStart) {
            case false:
              sendPrepareIventToLobby(lobby)
              break
            case true:
              if (!lobby.gameID) {
                lobby.markToDelete()
                break
              }
              sendStartIventToLobby(lobby)
              lobby.start()
              if (lobby.type != 'rating') lobby.markToDelete()
              const members: CachedMember[] = []
              for (let member of lobby.members.values())
                members.push({
                  username: member.data.name,
                  nickname: member.data.nick,
                })
              CachedLobbies.set(
                lobby.id,
                lobby.owner as string,
                lobby.map as string,
                members,
              )
                .then(() => {})
                .catch((e) => {
                  console.error(e)
                })
              break
          }
          break
        case Match.Lobby.States.started:
          if (Date.now() - lobby.startedAt!.getTime() > HOUR_IN_MS * 1)
            lobby.markToDelete()
          break
      }
    }
  } catch (e) {
    console.error(e)
  }
}, SECOND_IN_MS * 2)

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
  let player = PLAYERS.get(username)
  if (!player) player = await PLAYERS.spawn(username)
  if (player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.ALREADY_EXIST)

  let region = params[0]
  if (typeof region != 'string' || !isCorrectRegion(region))
    throw new TechnicalError('region', TechnicalCause.INVALID_FORMAT)

  let team = player.data.teamID ? TEAMS.get(player.data.teamID) : undefined
  if (team) {
    if (team.captainName != username)
      throw new TechnicalError('team captain', TechnicalCause.REQUIRED)
    Filters = createFilterForTeamSearch(team, region)
  } else Filters = createFiltersForSoloSearch(player.data, region)

  let type = params[1]
  if (!isCorrectType(type))
    throw new TechnicalError('regime type', TechnicalCause.INVALID)
  if (type == 'rating' && team) {
    if (
      typeof team.maximumRatingSpread == 'number' &&
      team.maximumRatingSpread > 100
    )
      throw new TechnicalError('team rating spread', TechnicalCause.INVALID)
  }

  Filters.byRegime(type)

  return Searcher.findLobby(Filters, player)
    .then((lobby) => {
      lobby.join(username)
      return { lobbyID: lobby.id, chatID: lobby.chat!.id }
    })
    .catch((e) => {
      throw e
    })
}
CONTROLLERS.set('find_lobby', find_lobby)

/**
 * Обработчик для выхода из лобби.
 * @category Lobby
 * @event
 */
export async function leave_lobby(socket: WebSocket, params: unknown[]) {
  const username = socket.username as string
  const player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  const lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  return lobby.leave(username)
}
CONTROLLERS.set('leave_lobby', leave_lobby)

/**
 * Контроллер для подтверждение входа в лобби.</br>
 *
 * @category Lobby
 * @event
 */
export async function ready(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  if (!StandOff_Lobbies.has(player.data.lobbyID)) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  player.event(PlayerSignals.be_ready)
  return true
}
CONTROLLERS.set('get_ready', ready)

/**
 * Контроллер для голосования за выбор карты(доступно только капитанам).</br>
 * @param params - ["map"]
 * - map может принимать значения, которые можно получить из контроллера get_maps
 *
 * @category Lobby
 * @event
 */
export async function vote(socket: WebSocket, params: unknown[]) {
  let map = params[0]
  if (typeof map != 'string')
    throw new TechnicalError('map', TechnicalCause.INVALID_FORMAT)

  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  lobby.vote(username, map)
  sendVoteIventToLobby(lobby)
  return true
}
CONTROLLERS.set('vote', vote)

/**
 * Контроллер для получения доступных карт.</br>
 *
 * @category Lobby
 * @event
 */
export async function get_maps(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  return lobby.maps
}
CONTROLLERS.set('get_maps', get_maps)

/**
 * Контроллер для смены команды.</br>
 * @param params - ["commandType"]
 * - commandType может принимать значения "spectators", "neutrals", "command1", "command2"
 *
 * @category Lobby
 * @event
 */
export async function change_command(socket: WebSocket, params: unknown[]) {
  let command = params[0]
  if (!isCorrectCommand(command))
    throw new TechnicalError('command', TechnicalCause.INVALID_FORMAT)
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)

    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  if (!lobby.move(username, command))
    throw new TechnicalError('member command', TechnicalCause.CAN_NOT_UPDATE)
  return true
}
CONTROLLERS.set('change_command', change_command)

/**
 * Контроллер для получения текущего капитана команды.</br>
 * @returns имя капитана команды игрока
 * @category Lobby
 * @event
 */
export async function get_captain(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('command', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  return {
    command1: lobby.firstCommand.captain,
    command2: lobby.secondCommand.captain,
  }
}
CONTROLLERS.set('get_captain', get_captain)

/**
 * Контроллер для получения текущего владельца лобби.</br>
 * @returns имя капитана команды игрока
 * @category Lobby
 * @event
 */
export async function get_owner(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('command', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.INVALID)
  }

  return lobby.owner
}
CONTROLLERS.set('get_owner', get_owner)

/**
 * Контроллер для получения id катки.</br>
 * @returns имя капитана команды игрока
 * @category Lobby
 * @event
 */
export async function get_game_id(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('command', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.INVALID)
  }

  return lobby.gameID
}
CONTROLLERS.set('get_game_id', get_game_id)

/**
 * Контроллер для установки id катки.</br>
 * @params ["id"]
 * @returns имя капитана команды игрока
 * @category Lobby
 * @event
 */
export async function set_game_id(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('command', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.INVALID)
  }

  let id = params[0]
  if (!id || typeof id != 'string')
    throw new TechnicalError('game id', TechnicalCause.INVALID_FORMAT)

  if (!lobby.setGameId(username, id)) return false
  sendPrepareIventToLobby(lobby)
  return true
}
CONTROLLERS.set('set_game_id', set_game_id)

/**
 * Контроллер для ручного удаления лобби после старта.</br>
 * @returns status:'success' в случае успеха или ошибку
 * @category Lobby
 * @event
 */
export async function force_stop_lobby(socket: WebSocket, params: unknown[]) {
  let username = socket.username as string
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('command', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.INVALID)
  }

  if (lobby.state != Match.Lobby.States.started)
    throw new TechnicalError('lobby state', TechnicalCause.INVALID)

  if (!lobby.owner || lobby.owner != username)
    throw new TechnicalError(
      'user privilelges',
      TechnicalCause.NEED_HIGHER_VALUE,
    )
  return lobby.markToDelete()
}
CONTROLLERS.set('force_stop_lobby', force_stop_lobby)

/**
 * Обработчик для приглашения игрока в лобби.
 * @param params - ["userNameToInvite"]
 *
 * В случае успеха отправляет указанному пользователю ивент invite  с пакетом следующего вида:
 * ```ts
 * {
 *  label: "lobby"
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
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.INVALID)
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
    user.notify(`Вас приглашает в лобби ${username}`)
  })

  const invite = new DTO({ label: 'lobby', lobbyID: lobby.id })
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

  let lobby = StandOff_Lobbies.get(lobbyID)
  if (!lobby) throw new TechnicalError('lobbyID', TechnicalCause.NOT_EXIST)

  if (!PLAYERS.has(socket.username)) await PLAYERS.spawn(socket.username)

  if (!lobby.join(socket.username)) return
  return {
    status: lobby.state,
    players: lobby.playersData,
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
  let player = PLAYERS.get(username)

  if (!player || !player.data.lobbyID)
    throw new TechnicalError('lobby', TechnicalCause.REQUIRED)

  let lobby = StandOff_Lobbies.get(player.data.lobbyID)
  if (!lobby) {
    player.event(PlayerSignals.corrupt)
    throw new TechnicalError('lobby', TechnicalCause.NOT_EXIST)
  }

  sendSyncIventToLobby(lobby)
  return true
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

  let lobby = StandOff_Lobbies.get(lobbyID)
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
  return StandOff_Lobbies.lobbies.length
}
CONTROLLERS.set('get_lobby_count', get_lobby_count)

export async function get_global_players_count(
  socket: WebSocket,
  params: unknown[],
) {
  return StandOff_Lobbies.counter
}
CONTROLLERS.set('get_global_players_count', get_global_players_count)

function isCorrectRegion(
  region: string,
): region is Rating.SearchEngine.SUPPORTED_REGIONS {
  if (region == 'Europe') return true
  if (region == 'Asia') return true
  return false
}

function createFilterForTeamSearch(
  team: Match.Player.Team.Instance,
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
  member: Match.Player.Data,
  region: Rating.SearchEngine.SUPPORTED_REGIONS,
) {
  const Filters = Searcher.Filters
  Filters.byRegion(region)
  Filters.byGRI(member.GRI)

  return Filters
}

async function sendSyncIventToLobby(lobby: Match.Lobby.Instance) {
  const dto = new DTO({
    label: 'sync',
    lobby: lobby.id,
    status: lobby.state,
    players: lobby.playersData,
  })
  lobby.chat.send('lobby', dto)
}

async function sendReadyIventToLobby(lobby: Match.Lobby.Instance) {
  const dto = new DTO({
    label: 'ready',
    lobby: lobby.id,
    players: lobby.playersData,
  })
  lobby.chat.send('lobby', dto)
}

function sendVoteIventToLobby(lobby: Match.Lobby.Instance) {
  let captains = {
    command1: lobby.firstCommand.captain,
    command2: lobby.secondCommand.captain,
  }

  const dto = new DTO({
    label: 'vote',
    captains,
    votingCaptain: lobby.votingCaptain,
    maps: lobby.maps,
  })
  lobby.chat.send('lobby', dto)
}

function sendPrepareIventToLobby(lobby: Match.Lobby.Instance) {
  const dto = new DTO({
    label: 'prepare',
    owner: lobby.owner,
    gameID: lobby.gameID,
  })
  lobby.chat.send('lobby', dto)
}

function sendStartIventToLobby(lobby: Match.Lobby.Instance) {
  const dto = new DTO({
    label: 'start',
  })
  lobby.chat.send('lobby', dto)
}
