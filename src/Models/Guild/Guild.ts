import { DocumentType, prop, ReturnModelType } from '@typegoose/typegoose'
import { validationCause, ValidationError } from '../../error'
import { UserModel, GuildModel } from '../index'
import { Info } from './GuildInfo'
import { Member, roles } from './Member'
import { PRICE_OF_GUILD_CREATION } from '../../configs/guild'
import { DTOError, PERFORMANCE_ERRORS } from '../../Classes/DTO/error'
import { generateGuildName } from '../../Utils/nameGenerator'
import { getRandom } from '../../Utils/math'

export class Guild {
  @prop({ required: true, default: [], type: () => String })
  subscribers!: string[]
  @prop({ required: true, default: [], type: () => Member })
  memberList!: Member[]
  @prop({ required: true })
  info!: Info
  @prop({ required: false })
  isPrivate!: boolean

  static async generateTestData(
    this: ReturnModelType<typeof Guild>,
    testDocumentsCount: number = 2,
  ) {
    let generatedDocuments: DocumentType<Guild>[] = []
    for (let i = 1; i < testDocumentsCount + 1; i++) {
      let users = await UserModel.generateTestData(5)
      let owner = users[0]
      owner.profile.balance = 10000
      owner.save()
      users.splice(0, 1)

      let newGuild = await this.new(
        await this.getRandomGuildTag(),
        await this.getRandomGuildName(),
        owner.profile.username,
      )

      for (let user of users) await newGuild.join(user.profile.username)
      generatedDocuments.push(newGuild)
    }

    return generatedDocuments
  }

  static async getTestData(this: ReturnModelType<typeof Guild>) {
    return this.find({
      'info.name': { $regex: 'test_' },
      'info.tag': { $regex: 'T' },
    })
  }

  static async deleteTestData(this: ReturnModelType<typeof Guild>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()
  }

  static async new(
    this: ReturnModelType<typeof Guild>,
    tag: string,
    guildName: string,
    ownerName: string,
  ) {
    let user = await UserModel.findByName(ownerName)
    if (!user) throw new DTOError(PERFORMANCE_ERRORS['wrong document'])
    user.buy(PRICE_OF_GUILD_CREATION)

    let guild = new this({
      info: { name: guildName, tag: tag },
      memberlist: [{ role: 'owner', name: ownerName }],
    })

    await user.save()
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
  ) {
    let executor = this.getMemberByName(executorName)
    if (!executor)
      throw new ValidationError('member', validationCause.NOT_EXIST)

    if (!executor.hasRightToExecute('addMember'))
      throw new DTOError(PERFORMANCE_ERRORS['wrong access level'])

    let member = new Member()
    ;(member.name = memberName),
      (member.id = await UserModel.findByName(memberName))
    member.role = roles.member
    this.memberList.push()
    return this.save()
  }

  async join(this: DocumentType<Guild>, memberName: string) {
    let User = await UserModel.findByName(memberName)
    if (!User) return

    switch (this.isPrivate) {
      case true: {
        this.subscribers.push(memberName)
        break
      }

      case false: {
        if (User.GRI < this.info.requiredMPR)
          throw new DTOError(PERFORMANCE_ERRORS['low mpr'])

        let member = new Member()
        ;(member.name = memberName), (member.id = User)
        member.role = roles.member

        this.memberList.push(member)

        User.joinGuild(this._id)
        await User.save()
        break
      }
    }
    return this.save()
  }

  async leave(this: DocumentType<Guild>, memberName: string) {
    if (this.deleteMemberByName(memberName)) {
      let User = await UserModel.findByName(memberName)
      User.leaveGuild()
      await User.save()
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
      throw new DTOError(PERFORMANCE_ERRORS['wrong access level'])
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
      throw new DTOError(PERFORMANCE_ERRORS['wrong document'])

    if (!executor.hasRightToExecute('changeRole'))
      throw new DTOError(PERFORMANCE_ERRORS['wrong access level'])

    if (executor.role <= newRole || member.role == newRole)
      throw new DTOError(PERFORMANCE_ERRORS['wrong access level'])
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
      throw new DTOError(PERFORMANCE_ERRORS['wrong access level'])

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
      throw new DTOError(PERFORMANCE_ERRORS['wrong access level'])

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

  private static async getRandomGuildTag() {
    let tag = `T${getRandom(0, 9)}${getRandom(0, 9)}`
    while (await GuildModel.findByTag(tag))
      tag = `T${getRandom(0, 9)}${getRandom(0, 9)}`
    return tag
  }

  private static async getRandomGuildName() {
    let name = `test_${generateGuildName()}#${getRandom(1, 99)}`
    while (await GuildModel.findByName(name))
      name = `test_${generateGuildName()}#${getRandom(1, 99)}`
    return name
  }
}
