import {
  DocumentType,
  getModelForClass,
  prop,
  ReturnModelType,
} from '@typegoose/typegoose'
import { validationCause, ValidationError } from '../../error'
import { UserModel } from '../index'
import { Info, Member, roles } from './'
import { Types } from 'mongoose'

export class Guild {
  @prop({ required: true, default: [] })
  memberList!: Types.Array<Member>
  @prop({ required: true })
  info!: Info

  static async create(
    this: ReturnModelType<typeof Guild>,
    tag: string,
    guildName: string,
    memberName: string,
  ) {
    let user = await UserModel.getByName(memberName)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

    let guild = new this()
    guild.memberList.push({ role: 'owner', name: memberName })
    guild.info.name = guildName
    guild.info.tag = tag
    await guild.validate()
    return guild.save()
  }

  static async getByName(
    this: ReturnModelType<typeof Guild>,
    guildName: string,
  ) {
    return this.findOne({ 'info.name': guildName })
  }

  static async getByTag(this: ReturnModelType<typeof Guild>, tag: string) {
    return this.findOne({ 'info.tag': tag })
  }

  getMemberByName(name: string) {
    for (let i = 0; i < this.memberList.length; i++)
      if (this.memberList[i].name == name) return this.memberList[i]
  }

  getMemberIndexByName(name: string) {
    for (let i = 0; i < this.memberList.length; i++)
      if (this.memberList[i].name == name) return i
  }

  deleteMemberByName(name: string): boolean {
    for (let i = 0; i < this.memberList.length; i++)
      if (this.memberList[i].name == name) {
        this.memberList.splice(i, 1)
        return true
      }
    return false
  }

  async addMember(
    this: DocumentType<Guild>,
    executorName: string,
    memberName: string,
  ) {
    let executor = this.getMemberByName(executorName)
    if (!executor)
      throw new ValidationError('member', validationCause.NOT_EXIST)

    if (!executor.hasRightToExecute('addMember'))
      throw new Error('No rights to execute order')
    this.memberList.push({ name: memberName, role: 'member' })
    return this.save()
  }

  async removeMember(
    this: DocumentType<Guild>,
    executorName: string,
    memberName: string,
  ) {
    let executor = this.getMemberByName(executorName)
    if (!executor)
      throw new ValidationError('member', validationCause.NOT_EXIST)

    if (!executor.hasRightToExecute('removeMember'))
      throw new Error('No rights to execute order')
    this.deleteMemberByName(memberName)
    return this.save()
  }

  async changeMemberRole(
    this: DocumentType<Guild>,
    executorName: string,
    memberName: string,
    newRole: roles,
  ) {
    let executor = this.getMemberByName(executorName)
    let member = this.getMemberByName(memberName)
    if (!executor || !member)
      throw new ValidationError('member', validationCause.NOT_EXIST)

    if (!executor.hasRightToExecute('changeRole'))
      throw new Error('No rights to execute order')

    if (executor.role <= newRole || member.role == newRole)
      throw new ValidationError('role', validationCause.INVALID)
    member.role = newRole
    return this.save()
  }

  async changeGuildName(
    this: DocumentType<Guild>,
    executorName: string,
    newName: string,
  ) {
    let executor = this.getMemberByName(executorName)
    if (!executor)
      throw new ValidationError('member', validationCause.NOT_EXIST)

    if (!executor.hasRightToExecute('changeName'))
      throw new Error('No rights to execute order')

    if (newName == this.info.name) return false
    if (await GuildModel.getByName(newName))
      throw new ValidationError('guild', validationCause.ALREADY_EXIST)

    this.info.name = newName
    await this.validate()
    return this.save()
  }

  async changeTagName(
    this: DocumentType<Guild>,
    executorName: string,
    newTag: string,
  ) {
    let executor = this.getMemberByName(executorName)
    if (!executor)
      throw new ValidationError('member', validationCause.NOT_EXIST)

    if (!executor.hasRightToExecute('changeTag'))
      throw new Error('No rights to execute order')

    if (newTag == this.info.tag) return false
    if (await GuildModel.getByTag(newTag))
      throw new ValidationError('guild tag', validationCause.ALREADY_EXIST)

    this.info.tag = newTag
    await this.validate()
    return this.save()
  }
}

export const GuildModel = getModelForClass(Guild)
