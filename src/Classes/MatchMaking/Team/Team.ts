import { UNDEFINED_MEMBER } from '../../../configs/match_manager'
import type { Match } from '../../../Interfaces'

export class Team implements Match.Team.Instance {
  private _members: Array<Match.Member.Instance> = new Array(5).fill(
    UNDEFINED_MEMBER,
  )
  private _membersCount = 0
  private _captain!: string
  constructor(private _id: number) {}

  get id() {
    return this._id
  }

  join(member: Match.Member.Instance): boolean {
    if (this._membersCount >= 5) return false

    member.teamID = this._id
    this._members[this._members.indexOf(UNDEFINED_MEMBER)] = member
    this._membersCount++

    if (!this._captain) this._captain = member.name
    return true
  }

  leave(member: Match.Member.Instance): boolean {
    if (this._membersCount == 0) return false
    let memberIndex = this._members.indexOf(member)
    if (!~memberIndex) return false

    member.teamID = undefined
    this._members[memberIndex] = UNDEFINED_MEMBER
    this._membersCount--
    return true
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

  isCaptain(member: string | Match.Member.Instance): boolean {
    let name = typeof member == 'string' ? member : member.name
    return name == this._captain
  }
}
