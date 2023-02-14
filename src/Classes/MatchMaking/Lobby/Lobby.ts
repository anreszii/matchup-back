import type { IChat, Match, Rating } from '../../../Interfaces/index'

import { COMMANDS } from '../Command/Manager'
import { PLAYERS } from '../MemberManager'

import { getMedian, getRandom } from '../../../Utils/math'

import { DiscordRoleManager } from '../../Discord/RoleManager'
import { GAME_MAPS } from '../../../configs/standoff_maps'
import { TEAMS } from '../Team/Manager'
import { TechnicalCause, TechnicalError } from '../../../error'
import { MINUTE_IN_MS, SECOND_IN_MS } from '../../../configs/time_constants'
import { DTO } from '../../DTO/DTO'
import { clientServer } from '../../../API/Sockets'
import { DISCORD_ROBOT } from '../../../app'
import { DiscordClient } from '../../Discord/Client'
import { Guild } from 'discord.js'

import { Logger } from '../../../Utils/Logger'

export class Lobby implements Match.Lobby.Instance {
  public region!: Rating.SearchEngine.SUPPORTED_REGIONS
  private _counter!: Match.Lobby.Counter
  private _logger!: Logger
  private _game!: Match.Manager.supportedGames
  private _stagesTimers: Map<Match.Lobby.State, Date> = new Map()
  private _timers: Map<string, Date> = new Map()
  private _commands: Map<
    Match.Lobby.Command.Types,
    Match.Lobby.Command.Instance
  > = new Map()
  private _turn: Exclude<Match.Lobby.Command.Types, 'spectators' | 'neutrals'> =
    'command1'
  private _maps = new Set(GAME_MAPS)
  private _owner?: string
  private _gameID?: string
  private _map?: string
  private _state: Match.Lobby.State = 'searching'

  private _discord?: { client: DiscordClient; guild: Guild }

  constructor(
    private _id: string,
    private _type: Match.Lobby.Type,
    private _maxCommandSize: number,
    private _controller: Match.Controller,
    private _chat: IChat.Controller,
  ) {
    this._game = _controller.gameName
    this._logger = new Logger(`LOBBY#${_id}`)
    this._commands.set(
      'spectators',
      COMMANDS.spawn(this.id, 'spectators', _maxCommandSize),
    )
    this._commands.set(
      'neutrals',
      COMMANDS.spawn(this.id, 'neutrals', _maxCommandSize * 4),
    )
    this._commands.set(
      'command1',
      COMMANDS.spawn(this.id, 'command1', _maxCommandSize),
    )
    this._commands.set(
      'command2',
      COMMANDS.spawn(this.id, 'command2', _maxCommandSize),
    )
  }

  async start() {
    if (this._state != 'preparing') return false
    if (!this._map) return false
    await this._controller.start()
    this._state = 'started'
    this._stagesTimers.set('started', new Date())
    return true
  }

  markToDelete() {
    if (this.state == 'searching') this._counter.searching -= this.membersCount
    else this._counter.playing -= this.membersCount

    this._state = 'deleted'
    this.delete()
    this._controller.stop()
    this._logger.info('MARKED TO DELETE')
    return true
  }

  async delete(): Promise<true> {
    this._logger.trace('COMMANDS DELETING')
    for (let [_, command] of this._commands) command.delete()
    this._logger.trace('MEMBERS LEAVING')
    for (let member of this.members.values()) {
      this._leaveNotify(member)
      member.lobbyID = undefined
      this._logger.trace(
        `MEMBER ${member.name} LEAVED; MEMBER DATA: ${JSON.stringify(member)}`,
      )
    }
    this._logger.trace('CHAT DELETING')
    await this.chat?.delete()
    this._logger.trace('DISCORD DELETING')
    await this._deleteDiscordLobby()
    return true
  }

  async move(
    name: string,
    command: Match.Lobby.Command.Instance | Match.Lobby.Command.Types | number,
  ): Promise<boolean> {
    let commandWithMember: Match.Lobby.Command.Instance | undefined
    for (let [type, command] of this.commands)
      if (command.has(name)) commandWithMember = command

    if (!commandWithMember)
      throw new TechnicalError('lobby member', TechnicalCause.NOT_EXIST)

    if (typeof command == 'string')
      return COMMANDS.move(
        name,
        commandWithMember,
        this._commands.get(command)!,
      )

    return COMMANDS.move(name, commandWithMember, command)
  }

  updateStatus(): Promise<void> {
    return this._updateState()
  }

  join(name: string) {
    this._logger.info(`${name} JOINS`)
    if (this._state != 'searching')
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    return PLAYERS.get(name).then((member) => {
      if (member.teamID) return this._joinWithTeam(member)
      else return this._joinSolo(member)
    })
  }

  leave(name: string, forceFlag = false) {
    this._logger.info(`${name} LEAVES`)
    if (this._state != 'searching' && this._state != 'filled' && !forceFlag)
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    let member = this.members.find((value) => {
      this._logger.debug(`searching name: ${name}. member: ${value.name}`)
      return value.name == name
    })
    if (!member || member.lobbyID != this.id)
      throw new TechnicalError('member', TechnicalCause.INVALID)

    if (member.teamID) return this._leaveWithTeam(member, forceFlag)
    else return this._leaveSolo(member)
  }

  vote(name: string, map: string): boolean {
    this._logger.info(`${name} VOTES FOR ${map}`)
    if (this._state != 'voting' || this._maps.size < 2)
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!this._maps.has(map))
      throw new TechnicalError('map', TechnicalCause.NOT_EXIST)

    this._checkTurn(name)
    this._maps.delete(map)
    this._startNextTurn()
    return true
  }

  canAddTeam(id: number): boolean {
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

  becomeReady(name: string): boolean {
    this._logger.info(`${name} READY`)
    for (let [type, command] of this._commands)
      if (command.becomeReady(name)) return true
    throw new TechnicalError('lobby member', TechnicalCause.NOT_EXIST)
  }

  setGameId(name: string, id: string) {
    if (this._state != 'preparing')
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!this._owner || name != this._owner)
      throw new TechnicalError('executor', TechnicalCause.INVALID)

    this._gameID = id
    return true
  }

  get gameID(): string | undefined {
    return this._gameID
  }

  get owner(): string | undefined {
    return this._owner
  }

  get readyToDrop(): boolean {
    return this._state == 'deleted'
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
    if (this._state != 'started') return undefined
    return this._map
  }

  get readyToStart() {
    if (this._state != 'preparing' || !this._stagesTimers.has('preparing'))
      return false
    return (
      Date.now() - this._stagesTimers.get('preparing')!.getTime() >
      MINUTE_IN_MS * 3
    )
  }

  get commands() {
    return this._commands
  }

  get id(): string {
    return this._id
  }

  get game() {
    return this._game
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

  get players() {
    return [...this.firstCommand.players, ...this.secondCommand.players]
  }

  get members(): Match.Member.Instance[] {
    return [
      ...this.spectators.players,
      ...this.neutrals.players,
      ...this.players,
    ]
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

  get isReady(): Promise<boolean> {
    if (this._state != 'filled')
      return new Promise((resolve) => {
        return resolve(false)
      })
    const passedTime = Date.now() - this._stagesTimers.get('filled')!.getTime()
    let somebodyWasKicked = false
    const promises = []

    for (let member of this.players) {
      if (!member.flags.ready && passedTime > SECOND_IN_MS * 20) {
        promises.push(this.leave(member.name))
        somebodyWasKicked = true
      }
    }
    if (somebodyWasKicked) {
      this._logger.info(`DOWNGRADE STATE TO SEARCH`)
      return Promise.all(promises).then(() => {
        if (this.state != 'deleted') this._setLobbyStateToSearching()
        return false
      })
    }

    return new Promise((resolve) => {
      resolve(this.firstCommand.isReady && this.secondCommand.isReady)
    })
  }

  get chat(): IChat.Controller {
    return this._chat
  }

  get startedAt() {
    return this._stagesTimers.get('started')
  }

  set chat(instance: IChat.Controller) {
    this._chat = instance
  }

  set counter(value: Match.Lobby.Counter) {
    this._counter = value
  }

  private _setLobbyStateToSearching() {
    for (let member of this.members) member.flags.ready = false
    this._state = 'searching'
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

  private async _joinWithTeam(member: Match.Member.Instance): Promise<boolean> {
    this._logger.trace(`TEAM ${member.teamID} JOING`)
    let team = TEAMS.findById(member.teamID!)
    if (!team) {
      member.teamID = undefined
      return false
    }

    if (team.captainName != member.name) return false
    if (!this._canAddTeam(team)) return false

    let promises = []
    for (let member of team.members.toArray)
      promises.push(this._joinSolo(member))

    await Promise.all(promises)
    this._logger.trace(`TEAM ${member.teamID} JOINED`)
    this._logger.trace(`TEAM ${team.id} DATA: ${JSON.stringify(team)}`)
    return true
  }

  private async _joinSolo(member: Match.Member.Instance) {
    this._logger.trace(`MEMBER ${member.name} JOING`)
    if (!(await this._controller.addMembers(member))) return false
    if (!(await this._joinCommand(member))) return false

    this.chat.join(member.name)

    this._joinNotify(member)

    this._logger.trace(`MEMBER ${member.name} JOINED`)
    this._logger.trace(`MEMBER ${member.name} DATA: ${JSON.stringify(member)}`)

    this._counter.searching++
    return true
  }

  private async _leaveWithTeam(
    member: Match.Member.Instance,
    forceFlag = false,
  ): Promise<boolean> {
    this._logger.trace(`TEAM ${member.teamID} LEAVING`)
    let team = TEAMS.findById(member.teamID!)
    if (!team) {
      member.teamID = undefined
      return this.leave(member.name)
    }

    if (this.type != 'rating') {
      if (!(await this._leaveSolo(member))) return false
      return team.leave(member.name)
    }

    if (team.captainName != member.name && !forceFlag) return false

    let promises = []
    for (let member of team.members.toArray)
      promises.push(this._leaveSolo(member))
    await Promise.all(promises)

    this._logger.trace(`TEAM ${member.teamID} LEAVED`)
    this._logger.trace(`TEAM ${team.id} DATA: ${JSON.stringify(team)}`)

    return true
  }

  private async _leaveSolo(member: Match.Member.Instance) {
    this._logger.trace(`MEMBER ${member.name} LEAVING`)
    if (!(await this._controller.removeMembers(member))) return false
    if (!(await this._leaveCommand(member))) return false

    this.chat.leave(member.name)
    this._stagesTimers = new Map()
    this._state = 'searching'

    member.lobbyID = undefined

    this._logger.trace(`MEMBER ${member.name} LEAVED`)
    this._logger.trace(`MEMBER ${member.name} DATA: ${JSON.stringify(member)}`)

    this._leaveNotify(member)
    if (this.membersCount == 0) this.markToDelete()
    this._counter.searching--
    return true
  }

  private _joinCommand(member: Match.Member.Instance) {
    this._logger.trace(`MEMBER ${member.name} JOING COMMAND`)
    return this._commandWithSpace!.join(member.name)
      .then((status) => {
        if (!status) return false
        member.lobbyID = this.id
        return true
      })
      .catch((e) => {
        throw e
      })
  }

  private _leaveCommand(member: Match.Member.InstanceData) {
    this._logger.trace(`MEMBER ${member.name} LEAVING COMMAND`)
    return COMMANDS.get(member.commandID!)!
      .leave(member.name)
      .then((status) => {
        if (!status) return false
        member.lobbyID = undefined

        return true
      })
      .catch((e) => {
        throw e
      })
  }

  private _canAddTeam(team: Match.Member.Team.Instance) {
    this._logger.trace(
      `CHECKING SPACE FOR TEAM. MAX TEAM SIZE: ${this._maxTeamSize}; TEAM SIZE: ${team.size}. HAS SPACE FOR TEAM: ${this.hasSpace}`,
    )
    if (this._maxTeamSize < team.size) return false
    if (!this.hasSpace(team.size)) return false
    return true
  }

  private async _updateState() {
    if (
      this._state == 'searching' &&
      this.playersCount == this._maxCommandSize * 2
    ) {
      for (let member of this.members) member.notify('Ваша игра найдена')

      this._stagesTimers.set('filled', new Date())
      this._state = 'filled'
    }
    if (this._state == 'filled' && (await this.isReady)) {
      this._counter.searching -= this.membersCount
      this._counter.playing += this.membersCount
      this._timers.set('turn_start', new Date())
      this._state = 'voting'
    }
    let isVotingStageEnd = this.isVotingStageEnd
    if (this._state == 'voting' && !isVotingStageEnd) {
      const timePassedAfterTurnStart =
        Date.now() - this._timers.get('turn_start')!.getTime()
      if (timePassedAfterTurnStart <= SECOND_IN_MS * 15) return

      const maps = this.maps
      this.vote(this.votingCaptain, maps[getRandom(0, maps.length - 1)])
      return
    } else if (this._state == 'voting' && isVotingStageEnd) {
      this._state = 'preparing'
      const captains = [this.firstCommand.captain, this.secondCommand.captain]
      this._owner = captains[getRandom(0, 1)]
      const status = await this._createDiscordChannel()
      if (!status) return
      await this._connectMembersToDiscordChannel()
    }

    if (this._state == 'preparing' && !this._stagesTimers.has('preparing'))
      this._stagesTimers.set('preparing', new Date())
  }

  private _joinNotify(member: Match.Member.Instance) {
    const dto = new DTO({ label: 'join', id: this.id, chat: this.chat.id })
    if (clientServer.Aliases.isSet(member.name))
      clientServer
        .control(clientServer.Aliases.get(member.name)!)
        .emit('lobby', dto.to.JSON)
  }

  private _leaveNotify(member: Match.Member.Instance) {
    const dto = new DTO({ label: 'leave', id: this.id })
    if (clientServer.Aliases.isSet(member.name))
      clientServer
        .control(clientServer.Aliases.get(member.name)!)
        .emit('lobby', dto.to.JSON)
  }

  private async _connectMembersToDiscordChannel() {
    if (!this._discord) {
      const status = await this._createDiscordChannel()
      if (!status) return false
    }

    const promises = []
    for (let member of this.members)
      promises.push(this._connectMemberToDiscordChannel(member))

    const result = await Promise.all(promises)
    if (!result) return false
    for (let status of result) if (!status) return false
    return true
  }

  private async _connectMemberToDiscordChannel(member: Match.Member.Instance) {
    if (!this._discord) return false
    let { client, guild } = this._discord
    return client.joinDiscordLobby(guild, member)
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
    for (let member of this.members)
      promises.push(this._deleteMemberFromDiscordChannel(member))

    const result = await Promise.all(promises)
    if (!result) return false
    for (let status of result) if (!status) return false
    return true
  }

  private async _deleteMemberFromDiscordChannel(member: Match.Member.Instance) {
    if (!this._discord) return false
    let { client, guild } = this._discord

    return client.leaveDiscordLobby(guild, member)
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
