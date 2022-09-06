import type { Chat } from '../../Interfaces'
export class ChatInstance implements Chat.Instance {
  constructor(
    private _id: number | string,
    private _controller: Chat.Controller.Instance,
  ) {}
  public get controller() {
    return this._controller
  }

  public get id() {
    return this._id
  }
  public async addMember(member: Chat.Member, executor?: Chat.Member) {
    this._controller.send(
      JSON.stringify({
        from: 'system',
        message: `${member!.name} joined chat`,
      }),
    )
    return this._controller.addMember(member)
  }

  public async deleteMember(member: Chat.Member, executor?: Chat.Member) {
    this._controller.send(
      JSON.stringify({
        from: 'system',
        message: `${member!.name} leaved chat`,
      }),
    )
    return this._controller.deleteMember(member)
  }

  public async send(message: string) {
    return this._controller.send(message)
  }
}
