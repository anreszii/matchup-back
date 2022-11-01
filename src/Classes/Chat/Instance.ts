import type { Chat } from '../../Interfaces'
import { ChatMessage } from '../../Interfaces/Chat/Chat'
import { OneTypeArray } from '../OneTypeArray'
export class ChatInstance implements Chat.Instance {
  private _memberNames: OneTypeArray<string> = new OneTypeArray(32)
  constructor(
    private _id: string,
    private _controller: Chat.Controller.Instance,
  ) {}
  public get controller() {
    return this._controller
  }

  public get id() {
    return this._id
  }
  public async addMember(member: Chat.Member, executor?: Chat.Member) {
    if (!this._controller.addMember(member)) return false
    this._memberNames.addOne(member.name)

    return true
  }

  public async deleteMember(member: Chat.Member, executor?: Chat.Member) {
    if (!this._controller.deleteMember(member)) return false
    this._memberNames.delete(member.name)

    return true
  }

  public async send(message: ChatMessage) {
    return this._controller.send(JSON.stringify(message))
  }

  public has(memberName: string) {
    return Boolean(~this._memberNames.indexOf(memberName))
  }
}
