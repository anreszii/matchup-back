import type { IChat, Match, Rating } from '../../../Interfaces/index'

import { COMMANDS } from '../Command/Manager'
import { PLAYERS } from '../MemberManager'

import { MemberList } from '../MemberList'
import { getMedian, minMax } from '../../../Utils/math'

import { DiscordClient } from '../../Discord/Client'
import { DiscordRoleManager } from '../../Discord/RoleManager'
import { GAME_MAPS } from '../../../configs/standoff_maps'
import { TEAMS } from '../Team/Manager'
import { TechnicalCause, TechnicalError } from '../../../error'
import { CLIENT_CHATS } from '../../Chat/Manager'
import { SECOND_IN_MS } from '../../../configs/time_constants'
import { UserModel } from '../../../Models'

export class Lobby implements Match.Lobby.Instance {
  public region!: Rating.SearchEngine.SUPPORTED_REGIONS
  private _counter!: Match.Lobby.Counter
  private _game!: Match.Manager.supportedGames
  private _prepareStageStarted?: Date
  private _members: MemberList = new MemberList()
  private _commands: Map<
    Match.Lobby.Command.Types,
    Match.Lobby.Command.Instance
  > = new Map()
  private _votes: {
    command: Exclude<Match.Lobby.Command.Types, 'spectators' | 'neutrals'>
    map: string
  }[] = []
  private _map?: string
  private _chat!: IChat.Controller
  private _discordClient!: DiscordClient
  private _status: Match.Lobby.Status = 'searching'
  private _deleted = false

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

  async stop() {
    await this.delete()
    await this._controller.stop()
    this._deleted = true
    return true
  }

  async delete(): Promise<true> {
    for (let [_, command] of this._commands) command.delete()
    for (let member of this.members.values()) {
      this.chat.leave(member.name)
      this._leaveDiscord(member.name)
      member.lobbyID = undefined
    }

    this.chat.delete()
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
    if (this._status != 'searching') return false
    this._counter.searching++
    let member = await PLAYERS.get(name)

    if (member.teamID) return this._joinWithTeam(member)
    else return this._joinSolo(member)
  }

  async leave(name: string) {
    await this._checkChat()
    if (this.status != 'searching' && this.status != 'filled') return false
    let member = this.members.getByName(name)
    if (!member || member.lobbyID != this.id) return false

    if (member.teamID) return this._leaveWithTeam(member)
    else return this._leaveSolo(member)
  }

  vote(name: string, map: string): boolean {
    if (this.status != 'voting')
      throw new TechnicalError('lobby status', TechnicalCause.INVALID)
    if (!GAME_MAPS.includes(map))
      throw new TechnicalError('map', TechnicalCause.NOT_EXIST)
    if (
      this.firstCommand.captain == name &&
      !this._votes.find((value) => value.command == 'command1')
    ) {
      this._votes.push({ command: 'command1', map })
      return true
    }
    if (
      this.secondCommand.captain == name &&
      !this._votes.find((value) => value.command == 'command2')
    ) {
      this._votes.push({ command: 'command2', map })
      return true
    }
    throw new TechnicalError(
      'member command role',
      TechnicalCause.NEED_HIGHER_VALUE,
    )
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

  get readyToDrop(): boolean {
    return this._deleted
  }

  get isVotingStageEnd(): boolean {
    if (this._map) return true
    if (this._votes.length != 2) return false

    this._map = this._mapFromVotes
    return true
  }

  get votes() {
    let result: { [key: string]: number } = {}
    for (let i = 0; i < this._votes.length; i++) {
      if (!result[this._votes[i].map]) result[this._votes[i].map] = 0
      result[this._votes[i].map]++
    }

    return result
  }

  get map() {
    if (this.status != 'started') return undefined
    return this._map
  }

  get readyToStart() {
    if (this.status != 'preparing' || !this._prepareStageStarted) return false
    return (
      Date.now() - this._prepareStageStarted.getMilliseconds() >
      SECOND_IN_MS * 5
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
    return this.firstCommand.isReady && this.secondCommand.isReady
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

  private get _mapFromVotes() {
    let recordsWithMaxVotes: { map: string; count: number }[] = [
      {
        map: '',
        count: -1,
      },
    ]
    const votes = this.votes
    for (let map in votes) {
      if (recordsWithMaxVotes[0].count < votes[map])
        recordsWithMaxVotes = [{ map, count: votes[map] }]
      else if (recordsWithMaxVotes[0].count == votes[map])
        recordsWithMaxVotes.push({ map, count: votes[map] })
    }

    if (recordsWithMaxVotes.length > 1)
      return recordsWithMaxVotes[minMax(0, recordsWithMaxVotes.length - 1)].map
    return recordsWithMaxVotes[0].map
  }

  private get _commandWithSpace() {
    if (this.type != 'rating') return this.neutrals
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
    if (!this._joinCommand(member)) return false

    this.chat.join(member.name)
    this._joinDiscord(member.discordNick).catch((e) => console.log(e))

    this._counter.searching++
    return true
  }

  private async _leaveWithTeam(
    member: Match.Member.InstanceData,
  ): Promise<boolean> {
    let team = TEAMS.findById(member.teamID!)
    if (!team) {
      member.teamID = undefined
      return this.leave(member.name)
    }

    if (this.type != 'rating') {
      if (!(await this.leave(member.name))) return false
      return team.leave(member.name)
    }

    if (team.captainName != member.name) return false

    let promises = []
    for (let member of team.members.toArray)
      promises.push(this._leaveSolo(member))
    await Promise.all(promises)
    return true
  }

  private async _leaveSolo(member: Match.Member.Instance) {
    if (!(await this._controller.removeMembers(member))) return false
    if (!this._leaveCommand(member)) return false

    this.chat.leave(member.name)
    this._leaveDiscord(member.discordNick).catch((e) => console.log(e))
    this._status = 'searching'

    this._counter.searching--
    return true
  }

  private _joinCommand(member: Match.Member.Instance) {
    if (!this._commandWithSpace!.join(member.name)) return false
    if (!this.members.addMember(member)) return false
    member.lobbyID = this.id

    return true
  }

  private _leaveCommand(member: Match.Member.InstanceData) {
    if (!COMMANDS.get(member.commandID!)!.leave(member.name)) return false
    if (!this.members.deleteMember(member.name)) return false
    member.lobbyID = undefined

    return true
  }

  private _canAddTeam(team: Match.Member.Team.Instance) {
    if (this._maxTeamSize < team.size) return false
    if (!this.hasSpace(team.size)) return false
    return true
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
      this._status = 'filled'
    }
    if (this._status == 'filled' && this.isReady) this._status = 'voting'
    if (this._status == 'voting' && this.isVotingStageEnd)
      this._status = 'preparing'

    if (this._status == 'preparing' && !this._prepareStageStarted)
      this._prepareStageStarted = new Date()
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
