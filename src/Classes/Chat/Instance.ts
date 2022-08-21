import type { Chat } from '../../Interfaces'
export class ChatInstance implements Chat.Instance {
  constructor(
    private _id: number,
    private _controller: Chat.Controller.Interface,
  ) {}
  public get controller() {
    return this._controller
  }

  public get id() {
    return this._id
  }
  public async addMember(member: Chat.Member, executor?: Chat.Member) {
    return this._controller.addMember(member)
  }

  public async deleteMember(member: Chat.Member, executor?: Chat.Member) {
    return this._controller.deleteMember(member)
  }

  public async send(message: string) {
    return this._controller.send(message)
  }
}
