import type { Match, Chat } from '../../../Interfaces'
import { getMedian } from '../../../Utils/math'
import { MemberList } from '../MemberList'
import { PLAYERS } from '../MemberManager'

export class Team implements Match.Member.Team.Instance {
  private _members: MemberList = new MemberList()
  private _captain!: string
  private _teamChat!: Chat.Instance
  private _maxTeamSize = 5

  constructor(private _id: number) {}

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

    if (!this._captain) this._captain = member.name
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

    member.readyFlag = false
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

  get isGuild(): boolean {
    return this._members.isGuild
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
}
