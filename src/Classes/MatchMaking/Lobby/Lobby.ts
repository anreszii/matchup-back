import { IChat, Match, Rating } from '../../../Interfaces/index'

import { COMMANDS } from '../Command/Manager'
import { PLAYERS } from '../Player/Manager'

import { getMedian, getRandom } from '../../../Utils/math'

import { DiscordRoleManager } from '../../Discord/RoleManager'
import { GAME_MAPS, MAX_COMMAND_SIZE } from '../../../configs/Lobby'
import { TEAMS } from '../Team/Manager'
import { TechnicalCause, TechnicalError } from '../../../error'
import { MINUTE_IN_MS, SECOND_IN_MS } from '../../../configs/time_constants'
import { DISCORD_ROBOT } from '../../../app'
import { DiscordClient } from '../../Discord/Client'
import { Guild } from 'discord.js'

import { Logger } from '../../../Utils/Logger'
import {
  PlayerSignals,
  PlayerStates,
} from '../../../Interfaces/MatchMaking/Player'

export class Lobby implements Match.Lobby.Instance {
  public region!: Rating.SearchEngine.SUPPORTED_REGIONS
  private _counter!: Match.Lobby.Counter
  private _availableLobbyTypesCounters!: Match.Lobby.AvailableLobbyTypesCounter
  private _logger!: Logger
  private _stateTimers: Map<Match.Lobby.States, Date> = new Map()
  private _timers: Map<string, Date> = new Map()
  private _turn: Exclude<Match.Lobby.Command.Types, 'spectators' | 'neutrals'> =
    'command1'
  private _maps = new Set(GAME_MAPS)
  private _state: Match.Lobby.States
  private _cashedState?: Match.Lobby.States
  private _owner?: string
  private _gameID?: string
  private _map?: string

  private _discord?: { client: DiscordClient; guild: Guild }

  constructor(
    private _id: string,
    private _type: Match.Lobby.Type,
    private _chat: IChat.Controller,
    private _commands: Map<
      Match.Lobby.Command.Types,
      Match.Lobby.Command.Instance
    >,
  ) {
    this._logger = new Logger(`LOBBY#${_id}`)
    this._state = Match.Lobby.States.searching
  }

  start() {
    if (this._state < Match.Lobby.States.preparing) return false
    if (!this._map) return false
    this._sendPlayerSignal(PlayerSignals.play)
    this._state = Match.Lobby.States.started
    this._stateTimers.set(Match.Lobby.States.started, new Date())
    return true
  }

  markToDelete() {
    this._cashedState = this._state
    this._state = Match.Lobby.States.deleted
    this._availableLobbyTypesCounters[this.type]--

    this._logger.trace('MEMBERS LEAVING')
    for (let player of this.players.values()) this.leave(player.PublicData.name)
    this._logger.trace('COMMANDS DELETING')
    for (let [_, command] of this._commands) command.delete()
    this._logger.trace('CHAT DELETING')
    this.chat.delete()
    this._logger.trace('DISCORD DELETING')
    this._deleteDiscordLobby()

    this._logger.info('MARKED TO DELETE')
    return true
  }

  delete(): boolean {
    return this.markToDelete()
  }

  move(name: string, commandType: Match.Lobby.Command.Types): boolean {
    const members = this.members
    if (!members.has(name)) return false
    const command = this._commands.get(commandType)!

    return COMMANDS.move(name, command.id)
  }

  join(name: string): boolean {
    this._logger.info(`${name} JOINS`)
    if (!this._currentStateIs(Match.Lobby.States.searching))
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!PLAYERS.has(name)) return false
    const player = PLAYERS.get(name)!
    if (player.state >= PlayerStates.waiting)
      throw new TechnicalError('player state', TechnicalCause.INVALID)
    if (player.PublicData.teamID) return this._joinWithTeam(player)
    else return this._joinSolo(player)
  }

  leave(name: string): boolean {
    this._logger.info(`${name} LEAVES`)
    if (this._state > Match.Lobby.States.filled)
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!this.members.has(name)) return false
    let member = this.members.get(name)!
    if (!member || member.PublicData.lobbyID != this.id)
      throw new TechnicalError('member', TechnicalCause.INVALID)

    if (member.PublicData.teamID) return this._leaveWithTeam(member)
    else return this._leaveSolo(member)
  }

  vote(name: string, map: string): boolean {
    this._logger.info(`${name} VOTES FOR ${map}`)
    if (!this._currentStateIs(Match.Lobby.States.voting) || this._maps.size < 2)
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!this._maps.has(map))
      throw new TechnicalError('map', TechnicalCause.NOT_EXIST)

    this._checkTurn(name)
    this._maps.delete(map)
    this._startNextTurn()
    return true
  }

  canAddTeam(id: Match.Player.Team.ID): boolean {
    let team = TEAMS.get(id)
    if (!team) return false

    return this._canAddTeam(team)
  }

  hasSpace(memberCount: number): boolean {
    if (
      this.firstCommand.hasSpaceFor(memberCount) ||
      this.secondCommand.hasSpaceFor(memberCount)
    )
      return true
    return false
  }

  setGameId(name: string, id: string) {
    if (!this._currentStateIs(Match.Lobby.States.preparing))
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!this._owner || name != this._owner)
      throw new TechnicalError('executor', TechnicalCause.INVALID)

    this._gameID = id
    return true
  }

  updateState(): void {
    if (this.membersCount == 0 && this._state != Match.Lobby.States.deleted)
      this.markToDelete()

    switch (this._state) {
      case Match.Lobby.States.deleted:
        return
      case Match.Lobby.States.searching:
        if (this.playersCount == MAX_COMMAND_SIZE * 2) {
          for (let player of this.players.values())
            player.notify('Ваша игра найдена')

          this._stateTimers.set(Match.Lobby.States.filled, new Date())
          this._state = Match.Lobby.States.filled
          return
        }
        break
      case Match.Lobby.States.filled:
        if (this.playersCount < MAX_COMMAND_SIZE * 2) {
          this._stateTimers.delete(Match.Lobby.States.filled)
          this._state = Match.Lobby.States.searching
          return
        }

        if (this.isReady) {
          this._counter.searching -= this.membersCount
          this._counter.playing += this.membersCount
          this._timers.set('turn_start', new Date())
          this._sendPlayerSignal(PlayerSignals.vote)
          this._state = Match.Lobby.States.voting
          return
        }
        break

      case Match.Lobby.States.voting:
        if (!this.isVotingStageEnd) {
          const timePassedAfterTurnStart =
            Date.now() - this._timers.get('turn_start')!.getTime()
          if (timePassedAfterTurnStart <= SECOND_IN_MS * 15) return

          const maps = this.maps
          this.vote(this.votingCaptain, maps[getRandom(0, maps.length - 1)])
          return
        }
        this._sendPlayerSignal(PlayerSignals.prepare)
        this._state = Match.Lobby.States.preparing
        const captains = [this.firstCommand.captain, this.secondCommand.captain]
        this._owner = captains[getRandom(0, 1)]
        this._createDiscordChannel()
          .then((status) => {
            if (!status) return
            this._connectMembersToDiscordChannel()
          })
          .catch((e: Error) => {
            this._logger.warning(
              `[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
            )
          })
        return
        break
      case Match.Lobby.States.preparing:
        if (!this._stateTimers.has(Match.Lobby.States.preparing))
          this._stateTimers.set(Match.Lobby.States.preparing, new Date())
        break
    }

    if (
      this._currentStateIs(Match.Lobby.States.preparing) &&
      !this._stateTimers.has(Match.Lobby.States.preparing)
    )
      this._stateTimers.set(Match.Lobby.States.preparing, new Date())
  }

  get gameID(): string | undefined {
    return this._gameID
  }

  get owner(): string | undefined {
    return this._owner
  }

  get readyToDrop(): boolean {
    return this._currentStateIs(Match.Lobby.States.deleted)
  }

  get isVotingStageEnd(): boolean {
    if (this._map) return true
    if (this._maps.size != 1) return false

    this._map = Array.from(this._maps)[0]
    return true
  }

  get maps() {
    return Array.from(this._maps)
  }

  get votingCaptain() {
    return this._getCaptainNameByTurn()
  }

  get map() {
    if (!this._currentStateIs(Match.Lobby.States.started)) return undefined
    return this._map
  }

  get readyToStart() {
    if (
      this._state != Match.Lobby.States.preparing ||
      !this._stateTimers.has(Match.Lobby.States.preparing)
    )
      return false
    return (
      Date.now() -
        this._stateTimers.get(Match.Lobby.States.preparing)!.getTime() >
      MINUTE_IN_MS * 3
    )
  }

  get commands() {
    return this._commands
  }

  get id(): string {
    return this._id
  }

  get type() {
    return this._type
  }

  get GRI(): number {
    return getMedian(
      this._commands.get('command1')!.GRI,
      this._commands.get('command2')!.GRI,
    )
  }

  get isForGuild(): boolean {
    return this.firstCommand.isGuild && this.secondCommand.isGuild
  }

  get firstCommand() {
    return this._commands.get('command1')!
  }

  get secondCommand() {
    return this._commands.get('command2')!
  }

  get neutrals() {
    return this._commands.get('neutrals')!
  }

  get spectators() {
    return this._commands.get('spectators')!
  }

  get state() {
    return this._state
  }

  get players(): Map<string, Match.Player.Instance> {
    return new Map([
      ...this.firstCommand.players,
      ...this.secondCommand.players,
    ])
  }

  get playersData() {
    const data = []
    for (let player of this.players.values()) data.push(player.PublicData)
    return data
  }

  get membersData() {
    const data = []
    for (let player of this.members.values()) data.push(player.PublicData)
    return data
  }

  get members(): Map<string, Match.Player.Instance> {
    return new Map([
      ...this.neutrals.players,
      ...this.spectators.players,
      ...this.players,
    ])
  }

  get playersCount(): number {
    return this.firstCommand.playersCount + this.secondCommand.playersCount
  }

  get membersCount(): number {
    return (
      this.firstCommand.playersCount +
      this.secondCommand.playersCount +
      this.spectators.playersCount +
      this.neutrals.playersCount
    )
  }

  get isReady(): boolean {
    if (this._state != Match.Lobby.States.filled) false
    const passedTime =
      Date.now() - this._stateTimers.get(Match.Lobby.States.filled)!.getTime()
    let somebodyWasKicked = false

    for (let player of this.players.values()) {
      if (player.state < PlayerStates.ready && passedTime > SECOND_IN_MS * 20) {
        this.leave(player.PublicData.name)
        somebodyWasKicked = true
      }
    }
    if (somebodyWasKicked) {
      this._logger.info(`DOWNGRADE STATE TO SEARCH`)
      if (this.state > Match.Lobby.States.searching)
        this._setLobbyStateToSearching()
      return false
    }

    return this.firstCommand.isReady && this.secondCommand.isReady
  }

  get chat(): IChat.Controller {
    return this._chat
  }

  get startedAt() {
    return this._stateTimers.get(Match.Lobby.States.started)
  }

  set chat(instance: IChat.Controller) {
    this._chat = instance
  }

  set counter(value: Match.Lobby.Counter) {
    this._counter = value
  }

  set typeCounters(value: Match.Lobby.AvailableLobbyTypesCounter) {
    this._availableLobbyTypesCounters = value
  }

  private _setLobbyStateToSearching() {
    this._sendPlayerSignal(PlayerSignals.join_lobby)
    this._state = Match.Lobby.States.searching
  }

  private _startNextTurn() {
    this._timers.set('turn_start', new Date())
    switch (this._turn) {
      case 'command1':
        this._turn = 'command2'
        return
      case 'command2':
        this._turn = 'command1'
        return
    }
  }

  private _checkTurn(name: string) {
    this._logger.trace('CHECKING CURRENT VOTING TURN')
    let captain = this._getCaptainNameByTurn()

    this._logger.trace(`CORRECT CAPTAIN: ${captain}; VOTED: ${name}`)
    if (captain != name)
      throw new TechnicalError('turn', TechnicalCause.INVALID)
  }

  private _getCaptainNameByTurn() {
    switch (this._turn) {
      case 'command1':
        return this.firstCommand.captain
      case 'command2':
        return this.secondCommand.captain
    }
  }

  private get _commandWithSpace() {
    //TODO восстановить когда начнем нормально реализовывать режимы после ЗБТ
    // if (this.type != 'rating') return this.neutrals
    if (this.firstCommand.hasSpaceFor(1)) return this.firstCommand
    if (this.secondCommand.hasSpaceFor(1)) return this.secondCommand
  }

  private _joinWithTeam(player: Match.Player.Instance): boolean {
    this._logger.trace(`TEAM ${player.PublicData.teamID} JOING`)
    const team = TEAMS.findById(player.PublicData.teamID!)!

    if (team.captainName != player.PublicData.name) return false
    if (!this._canAddTeam(team)) return false

    for (let player of team.players.values()) this._joinSolo(player)

    this._logger.trace(`TEAM ${player.PublicData.teamID} JOINED`)
    return true
  }

  private _joinSolo(player: Match.Player.Instance): boolean {
    this._logger.trace(`MEMBER ${player.PublicData.name} JOING`)
    if (!this._joinCommand(player.PublicData)) return false

    this.chat.join(player.PublicData.name)

    player.event(PlayerSignals.join_lobby, {
      lobby: this.id,
      chat: this.chat.id,
    })

    this._logger.trace(`MEMBER ${player.PublicData.name} JOINED`)
    this._logger.debug(`MEMBER DATA: ${JSON.stringify(player.PublicData)}`)

    this._updatePlayerCounterAfterJoin()
    this.updateState()
    return true
  }

  private _updatePlayerCounterAfterJoin(): void {
    this._counter.searching++
  }

  private _leaveWithTeam(player: Match.Player.Instance): boolean {
    this._logger.trace(`TEAM ${player.PublicData.teamID} LEAVING`)

    const team = TEAMS.findById(player.PublicData.teamID!)!
    if (team.captainName != player.PublicData.name) return false

    for (let player of team.players.values()) this._leaveSolo(player)

    this._logger.trace(`TEAM ${player.PublicData.teamID} LEAVED`)
    this._logger.debug(`TEAM ${team.id} DATA: ${JSON.stringify(team)}`)

    return true
  }

  private _leaveSolo(player: Match.Player.Instance): boolean {
    this._logger.trace(`MEMBER ${player.PublicData.name} LEAVING`)
    if (!this._leaveCommand(player.PublicData)) return false

    this.chat.leave(player.PublicData.name)
    this._stateTimers = new Map()

    player.event(PlayerSignals.leave_lobby)

    this._logger.trace(`MEMBER ${player.PublicData.name} LEAVED`)
    this._logger.debug(
      `MEMBER ${player.PublicData.name} DATA: ${JSON.stringify(player)}`,
    )

    this._updatePlayerCounterAfterLeave()
    this.updateState()
    return true
  }

  private _updatePlayerCounterAfterLeave(): void {
    let state: Match.Lobby.States

    if (this._currentStateIs(Match.Lobby.States.deleted))
      state = this._cashedState!
    else state = this._state

    if (
      this._stateIs(
        state,
        Match.Lobby.States.searching,
        Match.Lobby.States.filled,
      )
    )
      this._counter.searching--
    else this._counter.playing--
  }

  private _joinCommand(member: Match.Player.Data) {
    this._logger.trace(`MEMBER ${member.name} JOING COMMAND`)
    return this._commandWithSpace!.join(member.name)
  }

  private _leaveCommand(player: Match.Player.Data) {
    this._logger.trace(`MEMBER ${player.name} LEAVING COMMAND`)
    return this._commands.get(player.commandID!)!.leave(player.name)
  }

  private _canAddTeam(team: Match.Player.Team.Instance) {
    this._logger.trace(
      `CHECKING SPACE FOR TEAM. MAX TEAM SIZE: ${this._maxTeamSize}; TEAM SIZE: ${team.size}. HAS SPACE FOR TEAM: ${this.hasSpace}`,
    )
    if (this._maxTeamSize < team.size) return false
    if (!this.hasSpace(team.size)) return false
    return true
  }

  private _sendPlayerSignal(signal: PlayerSignals) {
    for (let member of this.members.values()) member.event(signal)
  }

  private _currentStateIs(...states: Match.Lobby.States[]): boolean {
    return this._stateIs(this._state, ...states)
  }

  private _stateIs(
    state: Match.Lobby.States,
    ...statesToCompare: Match.Lobby.States[]
  ): boolean {
    for (let stateToCompare of statesToCompare)
      if (state == stateToCompare) return true
    return false
  }

  private async _connectMembersToDiscordChannel() {
    if (!this._discord) {
      const status = await this._createDiscordChannel()
      if (!status) return false
    }

    const promises = []
    for (let player of this.players.values())
      promises.push(this._connectMemberToDiscordChannel(player))

    const result = await Promise.all(promises)
    if (!result) return false
    for (let status of result) if (!status) return false
    return true
  }

  private async _connectMemberToDiscordChannel(player: Match.Player.Instance) {
    if (!this._discord) return false
    let { client, guild } = this._discord
    return client.joinDiscordLobby(guild, player.PublicData)
  }

  private async _createDiscordChannel(): Promise<boolean> {
    return getDiscordGuildWithChannel(this.id)
      .then((guild) => {
        if (!guild) return false
        this._discord = {
          client: DISCORD_ROBOT,
          guild: guild,
        }
        return true
      })
      .catch((e) => {
        console.error(e)
        return false
      })
  }

  private async _deleteDiscordLobby() {
    if (!this._discord) return
    let { client, guild } = this._discord
    return this._deleteMembersFromDiscordChannel()
      .catch((e) => {
        console.error(e)
      })
      .finally(() => {
        client.removeLobby(guild, this.id).catch((e) => {
          console.error(e)
        })
      })
  }

  private async _deleteMembersFromDiscordChannel() {
    if (!this._discord) return false

    const promises = []
    for (let player of this.players.values())
      promises.push(this._deleteMemberFromDiscordChannel(player))

    const result = await Promise.all(promises)
    if (!result) return false
    for (let status of result) if (!status) return false
    return true
  }

  private async _deleteMemberFromDiscordChannel(player: Match.Player.Instance) {
    if (!this._discord) return false
    let { client, guild } = this._discord

    return client.leaveDiscordLobby(guild, player.PublicData)
  }

  private get _maxTeamSize() {
    let maxTeamSizeToJoin =
      this.firstCommand.maxTeamSizeToJoin >=
      this.secondCommand.maxTeamSizeToJoin
        ? this.firstCommand.maxTeamSizeToJoin
        : this.secondCommand.maxTeamSizeToJoin
    return maxTeamSizeToJoin
  }
}

async function getDiscordGuildWithChannel(ID: string) {
  return DISCORD_ROBOT.guildWithFreeChannelsForVoice
    .then(async (guild) => {
      if (guild) {
        await DiscordRoleManager.createTeamRole(guild, ID)
        await DISCORD_ROBOT.createChannelsForMatch(guild, ID)
        return guild
      }
      return null
    })
    .catch((e) => {
      console.error(e)
      return null
    })
}

export function isCorrectType(value: unknown): value is Match.Lobby.Type {
  if (!value || typeof value != 'string') return false
  switch (value) {
    case 'training':
      return true
    case 'arcade':
      return true
    case 'rating':
      return true
    default:
      return false
  }
}
