import { DocumentType, prop, ReturnModelType } from '@typegoose/typegoose'
import { Types } from 'mongoose'
import { v4 as uuid } from 'uuid'
import { TechnicalCause, TechnicalError } from '../../error'
import { IChat } from '../../Interfaces/index'
import { UserModel } from '../index'
import { ChatMember } from './Member'
import { Message } from './Message'

class ChatServiceInformation {
  @prop({ required: true, unique: true })
  id!: string
  @prop({ required: true })
  entityId!: string
  @prop({ required: true, default: new Date() })
  createdAt!: Date
  @prop({ required: true })
  type!: IChat.Type
}

export class Chat {
  @prop({
    required: true,
    type: () => ChatServiceInformation,
    default: new ChatServiceInformation(),
    _id: false,
  })
  info!: ChatServiceInformation
  @prop({
    required: true,
    type: () => ChatMember,
    default: [{ name: 'system' }],
    _id: false,
  })
  members!: Types.Array<ChatMember>
  @prop({ required: true, type: () => Message, default: [], _id: false })
  history!: IChat.Message[]

  static async spawn(
    this: ReturnModelType<typeof Chat>,
    type: IChat.Type,
    id: string,
  ) {
    let chat = new this()
    chat.info.id = `${type}-${uuid()}`
    chat.info.entityId = id
    chat.info.type = type

    await chat.save()
    return chat
  }

  static async get(this: ReturnModelType<typeof Chat>, id: string) {
    let chat = await this.findOne({ 'info.id': id })
    if (!chat) throw new TechnicalError('chat id', TechnicalCause.INVALID)

    return chat
  }

  async join(this: DocumentType<Chat>, memberName: string) {
    if (this.hasMember(memberName)) return true
    const user = await UserModel.findOne(
      { 'profile.username': memberName },
      '_id',
    )
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    this.members.push({ id: user.id, name: memberName })
    await this.save()

    return true
  }

  async leave(this: DocumentType<Chat>, memberName: string) {
    if (!this.hasMember(memberName)) return true

    let index = this.members.indexOf(this.getMember(memberName))
    this.members.splice(index, 1)
    await this.save()

    return true
  }

  async message(this: DocumentType<Chat>, message: IChat.Message) {
    if (!this.hasMember(message.author.name))
      throw new TechnicalError('chat member', TechnicalCause.NOT_EXIST)

    this.history.push(new Message(message))
    await this.save()

    return true
  }

  getMember(memberName: string) {
    for (let i = 0; i < this.members.length; i++)
      if (this.members[i].name == memberName) return this.members[i]
    throw new TechnicalError('chat member', TechnicalCause.NOT_EXIST)
  }

  hasMember(memberName: string) {
    for (let i = 0; i < this.members.length; i++)
      if (this.members[i].name == memberName) return true
    return false
  }
}
