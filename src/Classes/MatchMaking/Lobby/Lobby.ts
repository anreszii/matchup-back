import type { Chat, Match, Rating } from '../../../Interfaces'
import { matchCause, MatchError } from '../../../error'
import { MemberList } from '../MemberList'
import { toBoolean, getMedian } from '../../../Utils'
import { UserModel } from '../../../Models/index'

export class Lobby implements Match.Lobby.Instance {
  public members = new MemberList()
  private _game: Match.Manager.supportedGames
  private _chat?: Chat.Instance
  private _region!: Rating.SearchEngine.SUPPORTED_REGIONS
  private _membersGRI: Map<string, number> = new Map()

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

  public get GRI() {
    return getMedian(...this._membersGRI.values())
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

    this._membersGRI.set(member.name, await UserModel.getGRI(member.name))
    return true
  }

  public async removeMember(member: Match.Member.Instance) {
    if (!(await this._matchController.removeMembers(member))) return false
    if (!this.members.delete(member)) return false

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
