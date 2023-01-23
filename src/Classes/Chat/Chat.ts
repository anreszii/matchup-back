import type { Namespace } from 'gamesocket.io'
import type { DocumentType } from '@typegoose/typegoose'
import type { IChat } from '../../Interfaces/index'
import { Chat as DBChat } from '../../Models/Chat/Chat'
import { DTO } from '../DTO/DTO'
import { Message } from './Message'
import { TechnicalCause, TechnicalError } from '../../error'
import { MINUTE_IN_MS } from '../../configs/time_constants'
import { WebSocket } from 'uWebSockets.js'
import { ChatStore } from './Store'

export class Chat implements IChat.Controller {
  private _members: Array<string> = []
  private _deleted = false
  constructor(
    private _document: DocumentType<DBChat>,
    private _namespace: Namespace,
  ) {
    for (let member of _document.members) this._members.push(member.name)
    setInterval(
      function (this: DocumentType<DBChat>) {
        this.save().then()
      }.bind(this._document),
      MINUTE_IN_MS,
    )
  }

  connect(socket: WebSocket) {
    this._namespace.control(this.room).join(socket.id)
  }

  forceJoin(user: string) {
    if (this._namespace.Aliases.isSet(user))
      this._namespace
        .control(this.room)
        .join(this._namespace.Aliases.get(user)!)
  }

  join(user: string): true {
    if (user == 'system') return true
    if (!this._document.hasMember(user)) this._document.join(user)
    ChatStore.add(user, this.id)

    if (this._namespace.Aliases.isSet(user))
      this._namespace
        .control(this.room)
        .join(this._namespace.Aliases.get(user)!)

    const systemMessage = new Message('system', `${user} joined`)
    this.message(systemMessage)
    return true
  }

  leave(user: string): true {
    if (user == 'system') return true
    if (this._document.hasMember(user)) this._document.leave(user)
    ChatStore.delete(user, this.id)

    if (this._namespace.Aliases.isSet(user))
      this._namespace
        .control(this.room)
        .leave(this._namespace.Aliases.get(user)!)

    const systemMessage = new Message('system', `${user} leaved`)
    this.message(systemMessage)
    return true
  }

  message(message: Message): true {
    let member = this._document.getMember(message.author.name)
    if (!member)
      throw new TechnicalError('chat member', TechnicalCause.NOT_EXIST)

    message.author.avatar = member.avatar
    message.author.prefix = member.prefix

    let dto = new DTO({
      label: 'message',
      id: this.id,
      type: this.type,
      message,
    })
    this._namespace.control(this.room).emit('chat', dto.to.JSON)
    this._document.message(message)
    return true
  }

  send(event: string, content: DTO) {
    this._namespace.control(this.room).emit(event, content.to.JSON)
  }

  async delete(): Promise<true> {
    for (let member of this.members) this.leave(member)
    this._deleted = true
    return true
  }

  async drop(): Promise<true> {
    await this._document.delete()
    return this.delete()
  }

  get readyToDrop(): boolean {
    return this._deleted
  }

  get id(): string {
    return this._document.info.id
  }

  get room(): string {
    return this._document.info.entityId
  }

  get type(): IChat.Type {
    return this._document.info.type
  }

  get members() {
    return this._members
  }
}
