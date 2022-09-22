import {
  DocumentType,
  getModelForClass,
  prop,
  ReturnModelType,
} from '@typegoose/typegoose'
import { validationCause, ValidationError } from '../../error'
import { UserModel } from '../index'
import { Info } from './GuildInfo'
import { Member, roles } from './Member'
import { Types } from 'mongoose'
import { PRICE_OF_GUILD_CREATION } from '../../configs/guild'

export class Guild {
  @prop({ required: true, default: [] })
  memberList!: Types.Array<Member>
  @prop({ required: true })
  info!: Info
  @prop({ required: false })
  isPrivate!: boolean

  static async new(
    this: ReturnModelType<typeof Guild>,
    tag: string,
    guildName: string,
    ownerName: string,
  ) {
    let user = await UserModel.findByName(ownerName)
    if (!user) throw new ValidationError('user', validationCause.INVALID)
    await user.buy(PRICE_OF_GUILD_CREATION)

    let guild = new this({
      info: { name: guildName, tag: tag },
      memberlist: [{ role: 'owner', name: ownerName }],
    })

    await guild.validate()
    return guild.save()
  }

  static async findByName(
    this: ReturnModelType<typeof Guild>,
    guildName: string,
  ) {
    return this.findOne({ 'info.name': guildName })
  }

  static async findByTag(this: ReturnModelType<typeof Guild>, tag: string) {
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

  hasMember(name: string) {
    for (let i = 0; i < this.memberList.length; i++)
      if (this.memberList[i].name == name) return true

    return false
  }

  async addMember(
    this: DocumentType<Guild>,
    executorName: string,
    memberName: string,
    mpr: number,
  ) {
    let executor = this.getMemberByName(executorName)
    if (!executor)
      throw new ValidationError('member', validationCause.NOT_EXIST)

    if (!executor.hasRightToExecute('addMember'))
      throw new Error('No rights to execute order')
    this.memberList.push({ name: memberName, role: 'member', mpr: mpr })
    return this.save()
  }

  async join(this: DocumentType<Guild>, memberName: string) {
    let User = await UserModel.findByName(memberName)
    if (!User) return

    if (!this.isPrivate) {
      if (User.getGRI() < this.info.requiredMPR) throw Error('low MPR')

      this.memberList.push({
        name: memberName,
        user: User._id,
        role: roles.member,
      })
      await User.joinGuild(this._id)
      return this.save()
    }
  }

  async leave(this: DocumentType<Guild>, memberName: string) {
    if (this.deleteMemberByName(memberName)) {
      let User = await UserModel.findByName(memberName)
      await User.leaveGuild()
      return this.save()
    }
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
    if (await GuildModel.findByName(newName))
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
    if (await GuildModel.findByTag(newTag))
      throw new ValidationError('guild tag', validationCause.ALREADY_EXIST)

    this.info.tag = newTag
    await this.validate()
    return this.save()
  }

  async makePrivate(this: DocumentType<Guild>) {
    this.isPrivate = true
    return this.save()
  }

  async makePublic(this: DocumentType<Guild>) {
    this.isPrivate = false
    return this.save()
  }
}

export const GuildModel = getModelForClass(Guild)
