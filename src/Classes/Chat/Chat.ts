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
import { Logger } from '../../Utils/Logger'

export class Chat implements IChat.Controller {
  private _members: Array<string> = []
  private _deleted = false
  private _logger!: Logger
  constructor(
    private _document: DocumentType<DBChat>,
    private _namespace: Namespace,
  ) {
    this._logger = new Logger(`CHAT#${this.id}`)
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
    this._logger.info(`SOCKET#${socket.id} CONNECTED TO [ROOM ${this.room}]`)
  }

  forceJoin(user: string) {
    this._logger.trace(`USER ${user} FORCE JOINS TO [ROOM ${this.room}]`)
    if (this._namespace.Aliases.isSet(user)) {
      this._namespace
        .control(this.room)
        .join(this._namespace.Aliases.get(user)!)
      this._logger.info(`USER ${user} FORCE JOINED TO [ROOM ${this.room}]`)
    }
  }

  join(user: string): true {
    this._logger.info(`USER ${user} JOINS ROOM#${this.room}`)
    if (user == 'system') return true
    if (!this._document.hasMember(user)) this._document.join(user)
    ChatStore.add(user, this.id)

    if (this._namespace.Aliases.isSet(user))
      this._namespace
        .control(this.room)
        .join(this._namespace.Aliases.get(user)!)

    const systemMessage = new Message('system', `${user} joined`)
    this.message(systemMessage)
    this._logger.trace(`USER ${user} JOINED [ROOM ${this.room}]`)
    return true
  }

  leave(user: string): true {
    this._logger.info(`USER ${user} LEAVES [ROOM ${this.room}]`)
    if (user == 'system') return true
    if (this._document.hasMember(user)) this._document.leave(user)
    ChatStore.delete(user, this.id)

    if (this._namespace.Aliases.isSet(user))
      this._namespace
        .control(this.room)
        .leave(this._namespace.Aliases.get(user)!)

    const systemMessage = new Message('system', `${user} leaved`)
    this.message(systemMessage)
    this._logger.trace(`USER ${user} LEAVED [ROOM ${this.room}]`)
    return true
  }

  message(message: Message): true {
    this._logger.trace(`NEW MESSAGE: ${JSON.stringify(message)}`)
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
    this._logger.info(`NEW MESSAGE SENDED`)
    return true
  }

  send(event: string, content: DTO) {
    this._logger.trace(
      `SENDING [EVENT ${event}] to [ROOM ${this.room}] CONTENT: ${content.to.JSON}`,
    )
    this._namespace.control(this.room).emit(event, content.to.JSON)
  }

  async delete(): Promise<true> {
    this._logger.trace('DELETING CHAT')
    for (let member of this.members) this.leave(member)
    this._deleted = true
    this._logger.info('DELETED')
    return true
  }

  async drop(): Promise<true> {
    this._logger.trace('DROPING CHAT DOCUMENT')
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
