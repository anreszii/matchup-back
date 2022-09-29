import type { Match, Chat } from '../../../Interfaces'
import { UNDEFINED_MEMBER } from '../../../configs/match_manager'
import { UserModel } from '../../../Models/index'
import { getMedian } from '../../../Utils/math'

export class Team implements Match.Team.Instance {
  private _members: Array<Match.Member.Instance> = new Array(5).fill(
    UNDEFINED_MEMBER,
  )
  private _membersCount = 0
  private _captain!: string
  private _teamChat!: Chat.Instance
  private _membersGRI: Map<string, number> = new Map()

  constructor(private _id: number) {}

  get id() {
    return this._id
  }

  get GRI(): number {
    return getMedian(...this._membersGRI.values())
  }

  get membersCount(): number {
    return this._membersCount
  }

  async join(name: string): Promise<boolean> {
    if (this._membersCount >= 5) return false

    this._membersGRI.set(name, await UserModel.getGRI(name))
    let member = {
      name,
      readyFlag: false,
      command: 'neutral',
      teamID: this._id,
    } as Match.Member.Instance

    this._teamChat
      .addMember({ name: member.name, role: 'user' })
      .then(async (status) => {
        if (!status) throw new Error('Chat delete error')
        await this._teamChat.send(
          JSON.stringify({
            from: 'system',
            message: `${member.name} joined team#${this.id}`,
          }),
        )
      })

    this._members[this._members.indexOf(UNDEFINED_MEMBER)] = member
    this._membersCount++

    if (!this._captain) this._captain = member.name
    return true
  }

  async leave(name: string): Promise<boolean> {
    if (this._membersCount == 0) return false
    let member = this.getMember(name)
    if (!member) return false

    this._teamChat
      .deleteMember({ name: member.name, role: 'user' })
      .then(async (status) => {
        if (!status) throw new Error('Chat delete error')
        await this._teamChat.send(
          JSON.stringify({
            from: 'system',
            message: `${member!.name} leaved team#${this.id}`,
          }),
        )
      })

    member.teamID = undefined
    this._members[this._members.indexOf(member)] = UNDEFINED_MEMBER
    this._membersCount--
    return this._membersGRI.delete(member.name)
  }

  check(): Match.Member.Instance[] {
    let tmp = new Array()
    let members = this._members
    for (let index = 0; index < members.length; index++) {
      if (members[index] != UNDEFINED_MEMBER) tmp.push(members[index])
    }

    return tmp
  }

  set captain(name: string) {
    this._captain = name
  }
  get captain() {
    return this._captain
  }

  set chat(chat: Chat.Instance) {
    this._teamChat = chat
  }

  get chat() {
    return this._teamChat
  }

  getMember(name: string) {
    for (let index = 0; index < this._members.length; index++) {
      if (this._members[index].name == name) return this._members[index]
    }
  }

  isCaptain(member: string | Match.Member.Instance): boolean {
    let name = typeof member == 'string' ? member : member.name
    return name == this._captain
  }
}
