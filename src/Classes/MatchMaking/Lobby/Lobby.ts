import type { IChat, Match, Rating } from '../../../Interfaces/index'

import { COMMANDS } from '../Command/Manager'
import { PLAYERS } from '../MemberManager'

import { MemberList } from '../MemberList'
import { getMedian, getRandom, minMax } from '../../../Utils/math'

import { DiscordClient } from '../../Discord/Client'
import { DiscordRoleManager } from '../../Discord/RoleManager'
import { GAME_MAPS } from '../../../configs/standoff_maps'
import { TEAMS } from '../Team/Manager'
import { TechnicalCause, TechnicalError } from '../../../error'
import { CLIENT_CHATS } from '../../Chat/Manager'
import { MINUTE_IN_MS, SECOND_IN_MS } from '../../../configs/time_constants'
import { DTO } from '../../DTO/DTO'
import { clientServer } from '../../../API/Sockets'

export class Lobby implements Match.Lobby.Instance {
  public region!: Rating.SearchEngine.SUPPORTED_REGIONS
  private _counter!: Match.Lobby.Counter
  private _game!: Match.Manager.supportedGames
  private _stagesTimers: Map<Match.Lobby.Status, Date> = new Map()
  private _timers: Map<string, Date> = new Map()
  private _members: MemberList = new MemberList()
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
  private _chat!: IChat.Controller
  private _discordClient!: DiscordClient
  private _status: Match.Lobby.Status = 'searching'

  constructor(
    private _id: string,
    private _type: Match.Lobby.Type,
    private _maxCommandSize: number,
    private _controller: Match.Controller,
  ) {
    this._game = _controller.gameName
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
    if (this._status != 'preparing') return false
    if (!this._map) return false
    await this._controller.start()
    this._status = 'started'
    return true
  }

  async markToDelete() {
    await this.delete()
    await this._controller.stop()
    this._status = 'deleted'
    return true
  }

  async delete(): Promise<true> {
    for (let [_, command] of this._commands) command.delete()
    for (let member of this.members.values()) {
      this.chat.leave(member.name)
      this._leaveDiscord(member.discordNick).catch((e) => console.log(e))
      member.lobbyID = undefined
      this._leaveNotify(member.name)
    }
    this.chat?.delete()

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

  async join(name: string) {
    await this._checkChat()
    if (this._status != 'searching')
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    this._counter.searching++
    let member = await PLAYERS.get(name)

    if (member.teamID) return this._joinWithTeam(member)
    else return this._joinSolo(member)
  }

  async leave(name: string, forceFlag = false) {
    await this._checkChat()
    if (this.status != 'searching' && this.status != 'filled')
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    let member = this.members.getByName(name)
    if (!member || member.lobbyID != this.id)
      throw new TechnicalError('member', TechnicalCause.INVALID)

    if (member.teamID) return this._leaveWithTeam(member, forceFlag)
    else return this._leaveSolo(member, forceFlag)
  }

  vote(name: string, map: string): boolean {
    if (this._status != 'voting' || this._maps.size < 2)
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
    for (let [type, command] of this._commands)
      if (command.becomeReady(name)) return true
    throw new TechnicalError('lobby member', TechnicalCause.NOT_EXIST)
  }

  setGameId(name: string, id: string) {
    if (this.status != 'preparing')
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
    return this._status == 'deleted'
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
    if (this.status != 'started') return undefined
    return this._map
  }

  get readyToStart() {
    if (this.status != 'preparing' || !this._stagesTimers.has('preparing'))
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

  get members() {
    return this._members
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

  get status() {
    this._checkStatus()
    return this._status
  }

  get players() {
    return [...this.firstCommand.players, ...this.secondCommand.players]
  }

  get playersCount() {
    return this.firstCommand.playersCount + this.secondCommand.playersCount
  }

  get isReady(): boolean {
    if (this._status != 'filled') return false
    const passedTime = Date.now() - this._stagesTimers.get('filled')!.getTime()
    let somebodyWasKicked = false

    for (let member of this.players) {
      if (!member.isReady && passedTime > SECOND_IN_MS * 20) {
        this.leave(member.name, true)
        somebodyWasKicked = true
      }
    }
    if (!somebodyWasKicked)
      return this.firstCommand.isReady && this.secondCommand.isReady

    this._setLobbyStatusToSearching()
    return false
  }

  set discord(client: DiscordClient) {
    this._discordClient = client
  }

  get discord(): DiscordClient {
    return this._discordClient
  }

  get chat(): IChat.Controller {
    return this._chat
  }

  set chat(instance: IChat.Controller) {
    this._chat = instance
  }

  set counter(value: Match.Lobby.Counter) {
    this._counter = value
  }

  private _setLobbyStatusToSearching() {
    for (let member of this.members.toArray) member.isReady = false
    this._status = 'searching'
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
    let captain = this._getCaptainNameByTurn()

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
    return true
  }

  private async _joinSolo(member: Match.Member.Instance) {
    if (!(await this._controller.addMembers(member))) return false
    if (!(await this._joinCommand(member))) return false

    this.chat.join(member.name)
    this._joinDiscord(member.discordNick).catch((e) => console.log(e))

    this._counter.searching++

    this._joinNotify(member.name)
    return true
  }

  private async _leaveWithTeam(
    member: Match.Member.Instance,
    forceFlag = false,
  ): Promise<boolean> {
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
    return true
  }

  private async _leaveSolo(member: Match.Member.Instance, forceFlag = false) {
    if (this._status != 'searching' && this._status != 'filled' && !forceFlag)
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!(await this._controller.removeMembers(member))) return false
    if (!(await this._leaveCommand(member))) return false

    this.chat.leave(member.name)
    this._leaveDiscord(member.discordNick).catch((e) => console.log(e))
    this._stagesTimers = new Map()
    this._status = 'searching'

    this._counter.searching--
    member.lobbyID = undefined
    this._leaveNotify(member.name)
    return true
  }

  private _joinCommand(member: Match.Member.Instance) {
    return this._commandWithSpace!.join(member.name)
      .then((status) => {
        if (!status) return false
        if (!this.members.addMember(member)) return false
        member.lobbyID = this.id
        return true
      })
      .catch((e) => {
        throw e
      })
  }

  private _leaveCommand(member: Match.Member.InstanceData) {
    return COMMANDS.get(member.commandID!)!
      .leave(member.name)
      .then((status) => {
        if (!status) return false
        if (!this.members.deleteMember(member.name)) return false
        member.lobbyID = undefined

        return true
      })
      .catch((e) => {
        throw e
      })
  }

  private _canAddTeam(team: Match.Member.Team.Instance) {
    if (this._maxTeamSize < team.size) return false
    if (!this.hasSpace(team.size)) return false
    return true
  }

  private _checkStatus() {
    if (
      this._status == 'searching' &&
      this.playersCount == this._maxCommandSize * 2
    ) {
      for (let member of this.members.toArray)
        member.notify('Ваша игра найдена')

      let members = this._members.membersCount
      this._counter.searching -= members
      this._counter.playing += members

      this._stagesTimers.set('filled', new Date())
      this._status = 'filled'
    }
    if (this._status == 'filled' && this.isReady) {
      this._timers.set('turn_start', new Date())
      this._status = 'voting'
    }
    if (this._status == 'voting' && !this.isVotingStageEnd) {
      const timePassedAfterTurnStart =
        Date.now() - this._timers.get('turn_start')!.getTime()
      if (timePassedAfterTurnStart <= SECOND_IN_MS * 10) return

      const maps = this.maps
      this.vote(this.votingCaptain, maps[getRandom(0, maps.length - 1)])
      return
    } else if (this._status == 'voting' && this.isVotingStageEnd) {
      this._status = 'preparing'
      const captains = [this.firstCommand.captain, this.secondCommand.captain]
      this._owner = captains[getRandom(0, 1)]
    }

    if (this._status == 'preparing' && !this._stagesTimers.has('preparing'))
      this._stagesTimers.set('preparing', new Date())
  }

  private _joinNotify(name: string) {
    const dto = new DTO({ label: 'join', id: this.id })
    if (clientServer.Aliases.isSet(name))
      clientServer
        .control(clientServer.Aliases.get(name)!)
        .emit('lobby', dto.to.JSON)
  }

  private _leaveNotify(name: string) {
    const dto = new DTO({ label: 'leave', id: this.id })
    if (clientServer.Aliases.isSet(name))
      clientServer
        .control(clientServer.Aliases.get(name)!)
        .emit('lobby', dto.to.JSON)
  }

  private async _joinDiscord(name: string) {
    let guild = await this.discord.guildWithFreeChannelsForVoice
    if (!guild) return

    let command: 'mm_command1' | 'mm_command2'
    if (this.commands.get('command1')!.has(name)) command = 'mm_command1'
    else if (this.commands.get('command2')!.has(name)) command = 'mm_command2'
    else return

    let commandRole = await DiscordRoleManager.findRoleByName(guild, command)
    if (!commandRole) return

    let teamRole = await DiscordRoleManager.findRoleByTeamId(guild, this.id)
    if (!teamRole)
      teamRole = await DiscordRoleManager.createTeamRole(guild, this.id)

    this.discord
      .addRolesToMember(guild, name, teamRole, commandRole)
      .then(() => {
        this.discord
          .addUserToTeamVoiceChannel(name)
          .catch((e) => console.log(e))
      })
      .catch((e) => console.log(e))
    return true
  }

  private async _leaveDiscord(name: string) {
    let guild = await this.discord?.findGuildWithCustomTeamIdRole(this._id)
    if (guild)
      this.discord
        ?.removeUserFromMatchMaking(guild, name)
        .catch((e) => console.log(e))
    return true
  }

  private async _checkChat() {
    if (this._chat) return

    this._chat = await CLIENT_CHATS.spawn('lobby', `lobby#${this._id}`)
    for (let member of this._members.values()) this._chat.join(member.name)
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
