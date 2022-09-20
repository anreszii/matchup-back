import type { Chat, Match, Rating } from '../../../Interfaces'
import type { DiscordClient } from '../../Discord/Client'
import { matchCause, MatchError } from '../../../error'
import { MemberList } from '../MemberList'
import { toBoolean, getMedian } from '../../../Utils'
import { UserModel } from '../../../Models/index'
import { UNDEFINED_MEMBER } from '../../../configs/match_manager'
import { ChatInstance } from '../../index'
import { DiscordRoleManager } from '../../Discord/RoleManager'

export class Lobby implements Match.Lobby.Instance {
  public members = new MemberList()
  private _game: Match.Manager.supportedGames
  private _chat?: Chat.Instance
  private _region!: Rating.SearchEngine.SUPPORTED_REGIONS
  private _membersGRI: Map<string, number> = new Map()
  private _maxTeamSize: number = 1
  private _teamsSize: Map<number, number> = new Map()
  private _dsClient?: DiscordClient

  constructor(
    private _id: string,
    private _matchController: Match.Controller,
    ...members: Array<Match.Member.Instance>
  ) {
    if (members) {
      _matchController.addMembers(...members).then((status) => {
        if (!status) throw new MatchError(_id, matchCause.ADD_MEMBER)
        this.members.add(...members)
      })
    }
    this._game = _matchController.gameName
  }

  public get game() {
    return this._game
  }

  public get id() {
    return this._id
  }

  public get status() {
    if (this.members.quantityOfMembers == 0) return undefined
    if (this.members.quantityOfPlayers < 10) return 'searching'
    else return this._matchController.status
  }

  public get chat() {
    return this._chat
  }

  public get region() {
    return this._region
  }

  public get GRI() {
    return getMedian(...this._membersGRI.values())
  }

  public get dsClient(): DiscordClient | undefined {
    return this._dsClient
  }

  public set chat(instance: Chat.Instance | undefined) {
    this._chat = instance as ChatInstance
    for (let member of this.members.toArray) {
      if (member != UNDEFINED_MEMBER)
        this._chat!.addMember({ name: member!.name, role: 'user' })
    }
  }

  public set region(value: Rating.SearchEngine.SUPPORTED_REGIONS) {
    this._region = value
  }

  public set dsClient(client: DiscordClient | undefined) {
    this._dsClient = client
  }

  public async start() {
    return this._matchController.start()
  }

  public async stop() {
    return this._matchController.stop()
  }

  public async addMember(member: Match.Member.Instance) {
    if (!(await this._matchController.addMembers(member))) return false
    if (!this.members.add(member)) return false

    this._chat?.addMember({ name: member!.name, role: 'user' })
    this._membersGRI.set(member.name, await UserModel.getGRI(member.name))
    if (member.teamID) {
      if (!this._teamsSize.has(member.teamID))
        this._teamsSize.set(member.teamID, 1)
      else {
        let tmp = this._teamsSize.get(member.teamID)!
        this._teamsSize.set(member.teamID, tmp + 1)
        this._checkMaxTeamSize()
      }
    }

    if (this._dsClient) {
      let guild = await this._dsClient.guildWithFreeChannelsForVoice
      if (!guild) return true

      let commandRole = await DiscordRoleManager.findRoleByName(
        guild,
        'mm_command1',
      )
      if (!commandRole) return true

      let teamRole = await DiscordRoleManager.findRoleByTeamId(guild, this.id)
      if (!teamRole)
        teamRole = await DiscordRoleManager.createTeamRole(guild, this.id)

      this._dsClient.addRolesToMember(guild, member.name, teamRole, commandRole)
      this._dsClient.addUserToTeamVoiceChannel(member.name)
    }
    return true
  }

  public async removeMember(member: Match.Member.Instance) {
    if (!(await this._matchController.removeMembers(member))) return false
    if (!this.members.delete(member)) return false

    if (member.teamID) {
      let tmp = this._teamsSize.get(member.teamID)
      if (tmp) this._teamsSize.set(member.teamID, tmp - 1)

      this._checkMaxTeamSize()
    }
    this._chat?.deleteMember({ name: member!.name, role: 'user' })

    if (this._dsClient) {
      let guild = await this._dsClient.findGuildWithCustomTeamIdRole(this.id)
      if (!guild) return this._membersGRI.delete(member.name)

      this._dsClient.removeMatchMakingRolesFromUser(guild, member.name)
    }
    return this._membersGRI.delete(member.name)
  }

  /**
   *
   * @param объект, в котором обязательно должно быть поле name, а также опциональные поля readyFlag, command
   * @returns
   */
  public async updateMember(
    member: Required<Pick<Match.Member.Instance, 'name'>> & {
      [Key in Exclude<keyof Match.Member.Instance, 'name' | 'statistic'>]?:
        | Match.Member.Instance[Key]
        | string
    },
  ) {
    let tmp = this.members.getMember(member.name)
    if (tmp == this.members.currentUndefined) return false

    if (!member.name) return false
    if (!MemberList.isMember(member)) {
      if (!member.command || !MemberList.isCommand(member.command))
        member.command = tmp.command
      if (!member.readyFlag) member.readyFlag = tmp.readyFlag
      else member.readyFlag = toBoolean(member.readyFlag)

      if (
        !this._matchController.updateMember(
          member as unknown as Match.Member.Instance,
        )
      )
        return false

      //т.к. tmp является ссылкой на объект, меняя его элементы - меняются и элементы объекта в MemberList
      let tmpCommand = tmp.command
      tmp.command = member.command! as Match.Member.command
      tmp.readyFlag = member.readyFlag! as boolean

      if (
        tmpCommand != member.command &&
        (member.command == 'command1' || member.command == 'command2') &&
        this._dsClient
      ) {
        let guild = await this._dsClient.findGuildWithCustomTeamIdRole(this.id)
        if (!guild) return true
        this._dsClient.changeCommandRoleOfMember(
          guild,
          member.name,
          member.command,
        )
      }
      return true
    }

    if (!this._matchController.updateMember(member)) return false
    if (tmp == this.members.currentUndefined) return false

    tmp.command = member.command
    tmp.readyFlag = member.readyFlag

    return true
  }

  public canAddTeamWithSize(size: number): boolean {
    if (!this.hasSpace(size)) return false
    if (size > this._maxTeamSize) return false
    return true
  }

  public hasSpace(memberCount: number): false | 'command1' | 'command2' {
    if (5 - this.members.quantityOfFirstCommandMembers >= memberCount)
      return 'command1'
    if (5 - this.members.quantityOfSecondCommandMembers >= memberCount)
      return 'command1'
    return false
  }

  private _checkMaxTeamSize() {
    for (let [id, teamSize] of this._teamsSize)
      if (teamSize > this._maxTeamSize) this._maxTeamSize = teamSize
  }
}
