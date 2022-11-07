import type { Match, Chat } from '../../../Interfaces'
import { getMedian } from '../../../Utils/math'
import { MemberList } from '../MemberList'
import { PLAYERS } from '../MemberManager'

export class Team implements Match.Member.Team.Instance {
  private _members: MemberList = new MemberList()
  private _captain!: string
  private _teamChat!: Chat.Instance
  private _maxTeamSize = 5
  private _keyGuild?: string

  constructor(private _id: number) {}

  async join(name: string): Promise<boolean> {
    if (this.members.count >= 5) return false

    let member = await PLAYERS.get(name)
    if (!this.members.addMember(member)) return false

    let status = await this.chat.addMember({ name })
    if (status)
      await this.chat.send({
        from: 'system',
        content: `${member.name} joined team#${this.id}`,
      })
    this._checkGuildAfterJoin(member)

    if (!this._captain) this._captain = member.name
    return true
  }

  async leave(name: string): Promise<boolean> {
    if (this.members.count == 0) return false

    let member = this.members.getByName(name)
    if (!member) return false

    let status = await this.chat.deleteMember({ name })
    if (status)
      await this.chat.send({
        from: 'system',
        content: `${member!.name} leaved team#${this.id}`,
      })
    this._checkGuildAfterLeave()

    member.isReady = false
    member.teamID = undefined
    return this.members.deleteMember(name)
  }

  isCaptain(member: string | Match.Member.Instance): boolean {
    let name = typeof member == 'string' ? member : member.name
    return name == this._captain
  }

  hasSpaceFor(size: number): boolean {
    return this._maxTeamSize - size > 0
  }

  get id() {
    return this._id
  }

  get GRI(): number {
    const GRIArray: number[] = []
    for (let member of this._members.toArray) GRIArray.push(member.GRI)
    return getMedian(...GRIArray)
  }

  get isGuild() {
    return Boolean(this._keyGuild)
  }

  get members(): Match.Member.List {
    return this._members
  }

  get size(): number {
    return this._members.count
  }

  set captainName(name: string) {
    this._captain = name
  }

  get captainName() {
    return this._captain
  }

  set chat(chat: Chat.Instance) {
    this._teamChat = chat
  }

  get chat() {
    return this._teamChat
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
