import type { Chat, Match, Rating } from '../../../Interfaces'
import { matchCause, MatchError } from '../../../error'
import { MemberList } from '../MemberList'
import { toBoolean } from '../../../Utils'

export class Lobby implements Match.Lobby.Instance {
  public members = new MemberList()
  private _game: Match.Manager.supportedGames
  private _chat?: Chat.Instance
  private _region!: Rating.SearchEngine.SUPPORTED_REGIONS

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

  public set chat(instance: Chat.Instance | undefined) {
    this._chat = instance
  }

  public set region(value: Rating.SearchEngine.SUPPORTED_REGIONS) {
    this._region = value
  }

  public get region() {
    return this._region
  }

  public async start() {
    return this._matchController.start()
  }

  public async stop() {
    return this._matchController.stop()
  }

  public async addMember(member: Match.Member.Instance) {
    let status = await this._matchController.addMembers(member)
    if (!status) return false

    return this.members.add(member)
  }

  public async removeMember(member: Match.Member.Instance) {
    let status = await this._matchController.removeMembers(member)
    if (!status) return false

    status = this.members.delete(member)

    return status
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
      tmp.command = member.command! as Match.Member.command
      tmp.readyFlag = member.readyFlag! as boolean

      return true
    }

    if (!this._matchController.updateMember(member)) return false
    if (tmp == this.members.currentUndefined) return false

    tmp.command = member.command
    tmp.readyFlag = member.readyFlag

    return true
  }

  public hasSpace(memberCount: number): false | 'command1' | 'command2' {
    if (5 - this.members.quantityOfFirstCommandMembers >= memberCount)
      return 'command1'
    if (5 - this.members.quantityOfSecondCommandMembers >= memberCount)
      return 'command1'
    return false
  }
}
