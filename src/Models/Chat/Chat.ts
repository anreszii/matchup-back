import { DocumentType, prop, ReturnModelType } from '@typegoose/typegoose'
import { TechnicalCause, TechnicalError } from '../../error'
import { UserModel } from '../index'
import { Member } from './Member'
import { Message } from './Message'

export type CHAT_TYPE = 'private' | 'command' | 'lobby' | 'guild'

class ServiceInformation {
  @prop({ required: true, unique: true })
  id!: string
  @prop({ required: true, default: new Date() })
  createdAt!: Date
  @prop({ required: true })
  type!: CHAT_TYPE
}

class Chat {
  @prop({
    required: true,
    type: () => ServiceInformation,
    default: new ServiceInformation(),
    _id: false,
  })
  info!: ServiceInformation
  @prop({ required: true, type: () => Member, default: [], _id: false })
  members!: Member[]
  @prop({ required: true, type: () => Message, default: [], _id: false })
  history!: Message[]

  static async spawn(this: ReturnModelType<typeof Chat>, type: CHAT_TYPE) {
    let chat = new this()
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
    if (this.has(memberName)) return true
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
    if (!this.has(memberName)) return true

    let index = this.members.indexOf(this.get(memberName))
    this.members.splice(index, 1)
    await this.save()

    return true
  }

  async message(this: DocumentType<Chat>, author: string, content: string) {
    if (!this.has(author))
      throw new TechnicalError('chat member', TechnicalCause.NOT_EXIST)

    let message = new Message()
    message.author = author
    message.content = content

    this.history.push(message)
    await this.save()

    return true
  }

  get(memberName: string) {
    for (let i = 0; i < this.members.length; i++)
      if (this.members[i].name == memberName) return this.members[i]
    throw new TechnicalError('chat member', TechnicalCause.NOT_EXIST)
  }

  has(memberName: string) {
    for (let i = 0; i < this.members.length; i++)
      if (this.members[i].name == memberName) return true
    return false
  }
}
