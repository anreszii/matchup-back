import type { Chat, Match, Rating } from '../../../Interfaces/index'

import { COMMANDS } from '../Command/Manager'
import { TEAMS } from '../index'
import { PLAYERS } from '../MemberManager'

import { MemberList } from '../MemberList'
import { validationCause, ValidationError } from '../../../error'
import { getMedian } from '../../../Utils/math'

import { DiscordClient } from '../../Discord/Client'
import { DiscordRoleManager } from '../../Discord/RoleManager'

export class Lobby implements Match.Lobby.Instance {
  public region!: Rating.SearchEngine.SUPPORTED_REGIONS
  private _game!: Match.Manager.supportedGames
  private _members: MemberList = new MemberList()
  private _commands: Map<
    Match.Lobby.Command.Types,
    Match.Lobby.Command.Instance
  > = new Map()
  private _chat!: Chat.Instance
  private _discordClient!: DiscordClient

  constructor(
    private _id: string,
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
      COMMANDS.spawn(this.id, 'neutrals', _maxCommandSize),
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
    return this._controller.start()
  }

  async stop() {
    return this._controller.stop()
  }

  async join(name: string) {
    let member = await PLAYERS.get(name)

    if (member.teamID) return this._joinWithTeam(name)
    if (!(await this._controller.addMembers(member))) return false
    if (!this._joinCommand(member)) return false

    await this._joinChat(member.name)
    await this._joinDiscrod(member.name)
    return true
  }

  async leave(name: string) {
    let member = this.members.getByName(name)
    if (!member || member.lobbyID != this.id) return false

    if (member.teamID) return this._leaveWithTeam(name)
    if (!(await this._controller.removeMembers(name))) return false
    if (!this._leaveCommand(member)) return false

    await this._leaveChat(member.name)
    await this._leaveDiscord(member.name)
    return true
  }

  canAddTeam(id: number): boolean {
    let team = TEAMS.get(id)
    if (!team) return false

    if (this._maxTeamSize >= team.size) return false
    if (!this.hasSpace(team.size)) return false
    return true
  }

  hasSpace(memberCount: number): boolean {
    if (
      this.firstCommand.hasSpaceFor(memberCount) ||
      this.secondCommand.hasSpaceFor(memberCount)
    )
      return true
    return false
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

  get GRI(): number {
    return getMedian(
      this._commands.get('command1')!.GRI,
      this._commands.get('command2')!.GRI,
    )
  }

  get isForGuild(): boolean {
    return (
      this.firstCommand.members.isGuild && this.secondCommand.members.isGuild
    )
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
    if (this.members.playersCount < 10) return 'searching'
    else return this._controller.status
  }

  set discord(client: DiscordClient) {
    this._discordClient = client
  }

  get discord(): DiscordClient {
    return this._discordClient
  }

  get chat(): Chat.Instance {
    return this._chat
  }

  set chat(instance: Chat.Instance) {
    this._chat = instance
  }

  private get _commandWithSpace() {
    if (this.firstCommand.hasSpaceFor(1)) return this.firstCommand
    if (this.secondCommand.hasSpaceFor(1)) return this.secondCommand
  }

  private async _joinWithTeam(name: string): Promise<boolean> {
    let member = await PLAYERS.get(name)
    if (!member) throw new ValidationError('member', validationCause.NOT_EXIST)
    if (!member.teamID) return this.join(member.name)

    let team = TEAMS.findById(member.teamID)

    if (!team) {
      member.teamID = undefined
      return false
    }

    if (!this.canAddTeam(team.id)) return false

    let promises = []
    for (let member of team.members.toArray)
      promises.push(this.join(member.name))

    await Promise.all(promises)
    return true
  }

  private _joinCommand(member: Match.Member.Instance) {
    if (!this._commandWithSpace!.join(member.name)) return false
    if (!this.members.addMember(member)) return false
    member.lobbyID = this.id

    return true
  }

  private _joinChat(name: string) {
    return this._chat.addMember({ name }).then(async (status) => {
      if (status)
        await this._chat.send({
          from: 'system',
          content: `member ${name} joined lobby#${this._id}`,
        })
    })
  }

  private _joinDiscrod(name: string) {
    return this.discord.guildWithFreeChannelsForVoice.then(async (guild) => {
      if (!guild) return

      let commandRole = await DiscordRoleManager.findRoleByName(
        guild,
        'mm_command1',
      )
      if (!commandRole) return

      let teamRole = await DiscordRoleManager.findRoleByTeamId(guild, this.id)
      if (!teamRole)
        teamRole = await DiscordRoleManager.createTeamRole(guild, this.id)

      this.discord.addRolesToMember(guild, name, teamRole, commandRole)
      this.discord.addUserToTeamVoiceChannel(name)
    })
  }

  private async _leaveWithTeam(name: string): Promise<boolean> {
    let member = await PLAYERS.get(name)
    if (!member) throw new ValidationError('member', validationCause.NOT_EXIST)
    if (!member.teamID) return this.leave(member.name)

    let team = TEAMS.findById(member.teamID)
    if (!team) {
      return this.leave(member.name)
    }

    let promises = []
    for (let member of team.members.toArray)
      promises.push(this.leave(member.name))

    await Promise.all(promises)
    return true
  }

  private _leaveCommand(member: Match.Member.Instance) {
    if (!COMMANDS.get(member.commandID!)!.leave(member.name)) return false
    if (!this.members.deleteMember(member.name)) return false
    member.lobbyID = undefined

    return true
  }

  private _leaveChat(name: string) {
    return this._chat.deleteMember({ name }).then(async (status) => {
      if (!status) return
      await this._chat.send({
        from: name,
        content: `member ${name} leaved lobby#${this.id}`,
      })
    })
  }

  private _leaveDiscord(name: string) {
    return this.discord
      ?.findGuildWithCustomTeamIdRole(this._id)
      .then((guild) => {
        if (guild) this.discord?.removeMatchMakingRolesFromUser(guild, name)
      })
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
