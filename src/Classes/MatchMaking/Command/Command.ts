import type { Match, Chat } from '../../../Interfaces/index'
import { GuildModel, UserModel } from '../../../Models/index'
import { getMedian } from '../../../Utils/math'
import { MemberList } from '../MemberList'
import { PLAYERS } from '../MemberManager'

export class Command implements Match.Lobby.Command.Instance {
  private _members: MemberList = new MemberList()
  private _commandChat!: Chat.Instance
  private _captain!: string
  private _maxSize = 5

  constructor(
    private _commandID: number,
    private _lobbyID: string,
    private _commandType: Match.Lobby.Command.Types,
  ) {}

  async join(name: string): Promise<boolean> {
    if (this.members.count >= 5) return false

    let member = await PLAYERS.spawn(name)
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

  get id() {
    return this._commandID
  }

  get lobbyID(): string {
    return this._lobbyID
  }

  hasSpaceFor(size: number) {
    return this._maxSize - size > 0
  }

  get type() {
    return this._commandType
  }

  get GRI(): number {
    const GRIArray: number[] = []
    for (let member of this._members.toArray) GRIArray.push(member.GRI)
    return getMedian(...GRIArray)
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
}
