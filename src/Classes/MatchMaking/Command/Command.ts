import type { Match, IChat } from '../../../Interfaces/index'
import { getMedian } from '../../../Utils/math'

import { PLAYERS } from '../Player/Manager'
import { TEAMS } from '../Team/Manager'
import { Logger } from '../../../Utils/Logger'
import { Name } from '../../../Interfaces/MatchMaking/Player'

export class Command implements Match.Lobby.Command.Instance {
  private _players: Map<Name, Match.Player.Instance> = new Map()
  private _captain!: string
  private _teamIDs: Set<Match.Player.Team.ID> = new Set()
  private _keyGuild?: string
  private _deleted: boolean = false
  private _logger: Logger

  constructor(
    private _commandID: Match.Lobby.Command.ID,
    private _lobbyID: Match.Lobby.ID,
    private _commandType: Match.Lobby.Command.Types,
    private _maxSize: number = 5,
    private _chat: IChat.Controller,
  ) {
    this._logger = new Logger(
      `Command`,
      `LOBBY#${_lobbyID}-COMMAND#${_commandID}`,
    )
  }

  delete(): boolean {
    this._logger.trace('DELETING COMMAND')
    for (let player of this._players.values()) this.leave(player.data.name)
    this.chat.delete()
    this._deleted = true
    return true
  }

  join(playerName: string): boolean {
    this._logger.trace(`MEMBER ${playerName} JOINING COMMAND`)
    if (this.playersCount >= 5) return false

    let player = PLAYERS.get(playerName)
    if (!player) return false
    if (!this._players.set(player?.data.name, player)) return false

    this.chat.join(playerName)
    this._checkGuildAfterJoin(player.data)

    if (!this._captain) this._captain = player.data.name
    if (player.data.teamID) this._addTeamOfMember(player.data.teamID)
    player.data.commandID = this.type
    this._logger.trace(`MEMBER ${playerName} JOINED COMMAND`)
    return true
  }

  leave(playerName: string): boolean {
    this._logger.trace(`MEMBER ${playerName} LEAVING COMMAND`)
    if (this.playersCount == 0) return false

    let player = this._players.get(playerName)
    if (!player) return false

    this.chat.leave(playerName)
    if (player.data.teamID) this._deleteTeamOfMember(player.data.teamID)
    this._checkGuildAfterLeave()

    player.data.flags.ready = false
    player.data.commandID = undefined
    this._logger.trace(`MEMBER ${playerName} LEAVED COMMAND`)
    return this.players.delete(playerName)
  }

  isCaptain(member: string | Match.Player.Instance): boolean {
    let name = typeof member == 'string' ? member : member.data.name
    return name == this._captain
  }

  becomeReady(name: string): boolean {
    const player = this.players.get(name)
    if (!player) return false

    player.data.flags.ready = true
    return true
  }

  hasSpaceFor(size: number) {
    return this._maxSize - this.playersCount >= size
  }

  has(entity: Match.Player.Instance | string): boolean {
    if (typeof entity == 'string') return this.players.has(entity)
    else return this.players.has(entity.data.name)
  }

  get(name: string) {
    return this.players.get(name)
  }

  get id() {
    return this._commandID
  }

  get readyToDrop(): boolean {
    return this._deleted
  }

  get lobbyID(): string {
    return this._lobbyID
  }

  get type() {
    return this._commandType
  }

  /** Средний рейтинг среди всех участников команды */
  get GRI(): number {
    const GRIArray: number[] = []
    for (let player of this._players.values()) GRIArray.push(player.data.GRI)
    return getMedian(...GRIArray)
  }

  get isFilled() {
    return this._maxSize - this.size == 0
  }

  get isOneTeam(): boolean {
    if (!this.isFilled) return false
    let teamID: Match.Player.Team.ID | undefined
    let players = Array.from(this._players.values())
    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      if (!teamID) teamID = players[playerIndex].data.teamID
      if (!teamID && playerIndex == 0) return false
      if (teamID != players[playerIndex].data.teamID) return false
    }

    return true
  }

  get isForTeam(): boolean {
    return this.soloPlayersCount == 0
  }

  get maxTeamSizeToJoin() {
    return this._maxSize - (this.teamPlayersCount + this.soloPlayersCount)
  }

  /** Количество участников команды */
  get size(): number {
    return this._players.size
  }

  get isReady(): boolean {
    for (let member of this._players.values())
      if (!member.data.flags.ready) return false
    return true
  }

  get chat() {
    return this._chat
  }

  set captain(name: string) {
    this._captain = name
  }

  get captain() {
    return this._captain
  }

  get players() {
    return this._players
  }

  get playersCount() {
    return this._players.size
  }

  get playersData(): Match.Player.Data[] {
    const playersData = []
    for (let player of this.players.values()) playersData.push(player.data)

    return playersData
  }

  get teamPlayersCount() {
    let currentTeamMembersInCommand = 0
    for (let id of this._teamIDs.values())
      currentTeamMembersInCommand += this._countOfTeamMembersInCommand(id)

    return currentTeamMembersInCommand
  }

  get soloPlayersCount() {
    return this.playersCount - this.teamPlayersCount
  }

  get isGuild() {
    return Boolean(this._keyGuild)
  }

  private _addTeamOfMember(id: Match.Player.Team.ID) {
    if (TEAMS.has(id)) this._teamIDs.add(id)
  }

  private _deleteTeamOfMember(id: Match.Player.Team.ID) {
    if (this._teamIDs.has(id) && this._countOfTeamMembersInCommand(id) == 1)
      this._teamIDs.delete(id)
  }

  private _countOfTeamMembersInCommand(id: Match.Player.Team.ID) {
    let team = TEAMS.get(id)!
    let count = 0

    for (let player of team.players.values())
      if (player.data.commandID == this.id) count++

    return count
  }

  private _checkGuildAfterJoin(playerData: Match.Player.Data) {
    if (this.players.size == 0) {
      this._keyGuild = playerData.guild
      return
    }
    if (this._keyGuild != playerData.guild) this._keyGuild = undefined
  }

  private _checkGuildAfterLeave() {
    let players = Array.from(this._players.values())
    this._keyGuild = players[0].data.guild
    for (let i = 1; i < players.length; i++)
      if (players[i].data.guild != this._keyGuild)
        return (this._keyGuild = undefined)
  }
}

export function isCorrectCommand(
  value: unknown,
): value is Match.Lobby.Command.Types {
  if (!value || typeof value != 'string') return false
  switch (value) {
    case 'command1':
      return true
    case 'command2':
      return true
    case 'spectators':
      return true
    case 'neutrals':
      return true
    default:
      return false
  }
}
