import type { Match, Chat } from '../../../Interfaces/index'
import { getMedian } from '../../../Utils/math'
import { TEAMS } from '../index'
import { MemberList } from '../MemberList'
import { PLAYERS } from '../MemberManager'

export class Command implements Match.Lobby.Command.Instance {
  private _members: MemberList = new MemberList()
  private _commandChat!: Chat.Instance
  private _captain!: string
  private _teamIDs: Set<number> = new Set()
  private _keyGuild?: string

  constructor(
    private _commandID: number,
    private _lobbyID: string,
    private _commandType: Match.Lobby.Command.Types,
    private _maxSize: number = 5,
  ) {}

  async join(name: string): Promise<boolean> {
    if (this.members.count >= 5) return false

    let member = await PLAYERS.get(name)
    if (!this.members.addMember(member)) return false

    this.chat.addMember({ name }).then(async (status) => {
      if (!status) return
      await this.chat.send({
        from: 'system',
        content: `${member.name} joined team#${this.id}`,
      })
    })
    this._checkGuildAfterJoin(member)

    if (!this._captain) this._captain = member.name
    if (member.teamID) this._addTeamOfMember(member.teamID)
    member.commandID = this.id
    return true
  }

  async leave(name: string): Promise<boolean> {
    if (this.members.count == 0) return false

    let member = this.members.getByName(name)
    if (!member) return false

    this.chat.deleteMember({ name }).then(async (status) => {
      if (!status) return
      await this.chat.send({
        from: 'system',
        content: `${member!.name} leaved team#${this.id}`,
      })
    })

    if (member.teamID) this._deleteTeamOfMember(member.teamID)
    this._checkGuildAfterLeave()

    member.readyFlag = false
    member.commandID = undefined
    return this.members.deleteMember(name)
  }

  isCaptain(member: string | Match.Member.Instance): boolean {
    let name = typeof member == 'string' ? member : member.name
    return name == this._captain
  }

  hasSpaceFor(size: number) {
    return this._maxSize - size > 0
  }

  get id() {
    return this._commandID
  }

  get lobbyID(): string {
    return this._lobbyID
  }

  get type() {
    return this._commandType
  }

  get GRI(): number {
    const GRIArray: number[] = []
    for (let member of this._members.toArray) GRIArray.push(member.GRI)
    return getMedian(...GRIArray)
  }

  get isForTeam(): boolean {
    return this.soloPlayersCount == 0
  }

  get maxTeamSizeToJoin() {
    return this.playersCount - (this.teamPlayersCount + this.soloPlayersCount)
  }

  get members(): Match.Member.List {
    return this._members
  }

  get size(): number {
    return this._members.count
  }

  set chat(chat: Chat.Instance) {
    this._commandChat = chat
  }

  get chat() {
    return this._commandChat
  }

  set captain(name: string) {
    this._captain = name
  }

  get captain() {
    return this._captain
  }

  get players() {
    return this._members.toArray
  }

  get playersCount() {
    return this._members.count
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

  private _addTeamOfMember(id: number) {
    if (TEAMS.has(id)) this._teamIDs.add(id)
  }

  private _deleteTeamOfMember(id: number) {
    if (this._teamIDs.has(id) && this._countOfTeamMembersInCommand(id) == 1)
      this._teamIDs.delete(id)
  }

  private _countOfTeamMembersInCommand(id: number) {
    let team = TEAMS.get(id)!
    let count = 0

    for (let member of team.members.toArray)
      if (member.commandID == this.id) count++

    return count
  }

  private _checkGuildAfterJoin(member: Match.Member.Instance) {
    if (this.members.count == 0) {
      this._keyGuild = member.guildName
      return
    }
    if (this._keyGuild != member.guildName) this._keyGuild = undefined
  }

  private _checkGuildAfterLeave() {
    let members = this.members.toArray
    this._keyGuild = members[0].guildName
    for (let i = 1; i < members.length; i++)
      if (members[i].guildName != this._keyGuild)
        return (this._keyGuild = undefined)
  }
}
