import { DocumentType, prop, ReturnModelType } from '@typegoose/typegoose'
import { CLIENT_CHATS } from '../../Classes/Chat/Manager'

import { PrivateInfo, PublicInfo, Terms } from './Info'
import { ImageModel } from '../Image'
import { PRICE_OF_GUILD_CREATION } from '../../configs/guild'

import { GuildMemberData } from './Member'
import { PERMISSION } from './Permissions'

import { generateGuildName } from '../../Utils/nameGenerator'
import { getRandom } from '../../Utils/math'

import { User, UserModel } from '../index'
import { TechnicalCause, TechnicalError } from '../../error'

type PartialInfoWithRequiredNameAndTag = Required<
  Pick<PublicInfo, 'name' | 'tag'>
> &
  Partial<Omit<PublicInfo, 'GRI' | 'name' | 'tag'>>
export class Guild {
  @prop({
    required: true,
    default: new PublicInfo(),
    _id: false,
    type: () => PublicInfo,
  })
  public!: PublicInfo
  @prop({
    required: true,
    default: new PrivateInfo(),
    _id: false,
    type: () => PrivateInfo,
  })
  private!: PrivateInfo
  @prop({ required: true, _id: false, type: () => Terms })
  terms!: Terms
  @prop({
    required: true,
    _id: false,
    default: new Map([['owner', Array.from(new Set([PERMISSION.ALL]))]]),
    type: () => Array,
  })
  roles!: Map<string, PERMISSION[]>
  @prop({
    required: true,
    default: new Map(),
    type: () => GuildMemberData,
  })
  members!: Map<string, GuildMemberData>

  static async create_guild(
    this: ReturnModelType<typeof Guild>,
    owner: string,
    info: PartialInfoWithRequiredNameAndTag,
    terms?: Partial<Terms>,
  ) {
    const user = await UserModel.findByName(owner)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    if (!(await user.is_premium())) {
      user.buy(PRICE_OF_GUILD_CREATION)
      await user.save()
    }

    const guild = new this()
    await guild.create_chat()
    const { name, tag, description } = info
    if (!name || !tag)
      throw new TechnicalError(
        'guild public info',
        TechnicalCause.INVALID_FORMAT,
      )

    guild.public.name = name
    guild.public.tag = tag
    if (typeof description == 'string') guild.public.description = description

    guild.terms = new Terms()
    guild.members.set(user.profile.username, {
      id: user._id,
      mpr: user.GRI,
      role: 'owner',
    })

    user.guild = guild
    await user.save()

    if (!terms) return guild.save()

    const { private: privateStatus, minimalGRI, invitationOnly } = terms
    if (typeof privateStatus == 'boolean') guild.terms.private = privateStatus
    if (guild.terms.private == false) return guild.save()
    if (typeof minimalGRI == 'number' && minimalGRI >= 0)
      guild.terms.minimalGRI = minimalGRI
    if (typeof invitationOnly == 'boolean')
      guild.terms.invitationOnly = invitationOnly

    await guild.save()

    return guild
  }

  static async deleteGuild(
    this: ReturnModelType<typeof Guild>,
    owner: string,
    password: string,
  ) {
    let guild = await this.get_guild_by_user(owner)
    await guild.validate_owner(owner, password)

    await this.deleteOne({ _id: guild._id })
    return true
  }

  static async generateTestData(
    this: ReturnModelType<typeof Guild>,
    testDocumentsCount: number = 1,
  ) {
    let guilds = []
    for (let i = 1; i < testDocumentsCount + 1; i++)
      guilds.push(await this.generate_test_document())

    return guilds
  }

  static async getTestData(this: ReturnModelType<typeof Guild>) {
    return this.find({
      'public.name': { $regex: 'test_' },
      'public.tag': { $regex: 'T#' },
    }) as unknown as Promise<DocumentType<Guild>[]>
  }

  static async deleteTestData(this: ReturnModelType<typeof Guild>) {
    let documents = await this.getTestData()
    for (let document of documents) await document.delete()

    return true
  }

  async join(this: DocumentType<Guild>, name: string) {
    if (this.members.size >= 50)
      throw new TechnicalError('members', TechnicalCause.NEED_LOWER_VALUE)
    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    if (!this.terms.private) return this.add_member(user)
    if (!this.terms.invitationOnly) return this.store_request(user)
    return this.add_by_invite(user)
  }

  async invite(this: DocumentType<Guild>, executor: string, name: string) {
    this.check_member_permissions(executor, PERMISSION.INVITE)
    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    user.notify(`Вас пригласили в клан ${this.public.name}`)

    return this.store_invite(user)
  }

  async acceptRequest(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
  ) {
    this.check_member_permissions(executor, PERMISSION.ACCEPT_REQUEST)
    if (!this.private.requests.has(name))
      throw new TechnicalError('request', TechnicalCause.NOT_EXIST)

    this.members.set(name, this.private.requests.get(name)!)
    this.private.requests.delete(name)

    UserModel.findByName(name).then((user) => {
      if (!user) return
      user.notify(`Ваш запрос в клан ${this.public.name} принят`)
    })

    return true
  }

  async leave(this: DocumentType<Guild>, name: string) {
    this.remove_member(name)
    await this.save()
    return true
  }

  async rejectRequest(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
  ) {
    this.check_member_permissions(executor, PERMISSION.ACCEPT_REQUEST)
    if (!this.private.requests.has(name)) return true

    this.private.requests.delete(name)

    UserModel.findByName(name).then((user) => {
      if (!user) return
      user.notify(`Ваш запрос в клан ${this.public.name} отклонен`)
    })

    return true
  }

  async kick(this: DocumentType<Guild>, executor: string, name: string) {
    this.check_member_permissions(executor, PERMISSION.KICK)
    this.remove_member(name)
    await this.save()
    return true
  }

  async ban(this: DocumentType<Guild>, executor: string, name: string) {
    this.check_member_permissions(executor, PERMISSION.KICK)
    this.check_member_permissions(executor, PERMISSION.CHANGE_BLACK_LIST)
    this.remove_member(name)
    this.add_to_black_list(name)
    await this.save()
    return true
  }

  async addToBlackList(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
  ) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_BLACK_LIST)
    this.add_to_black_list(name)
    await this.save()
    return true
  }

  async createRole(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
    permissions: PERMISSION[],
  ) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
    this.roles.set(name, Array.from(new Set(permissions)))
    await this.save()

    return true
  }

  async changeRole(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
    newRole: { name?: string; permissions?: PERMISSION[] },
  ) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
    let role = this.roles.get(name)
    if (!role) throw new TechnicalError('role', TechnicalCause.NOT_EXIST)
    if (newRole.name) this.change_role_name(name, newRole.name)
    if (newRole.permissions)
      this.change_role_permissions(name, newRole.permissions)

    await this.save()
    return true
  }

  async deleteRole(this: DocumentType<Guild>, executor: string, name: string) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
    if (!this.roles.has(name)) return true
    this.roles.delete(name)
    await this.save()

    return true
  }

  async giveRole(
    this: DocumentType<Guild>,
    executor: string,
    member: string,
    role: string,
  ) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
    if (role == 'owner')
      throw new TechnicalError('role', TechnicalCause.CAN_NOT_UPDATE)
    if (!this.roles.has(role))
      throw new TechnicalError('role', TechnicalCause.NOT_EXIST)
    if (!this.members.has(member))
      throw new TechnicalError('member', TechnicalCause.NOT_EXIST)

    this.members.get(member)!.role = role
    await this.save()

    return true
  }

  async changeOwner(
    this: DocumentType<Guild>,
    executor: string,
    executorPassword: string,
    member: string,
  ) {
    if (!this.members.has(executor) || !this.members.has(member))
      throw new TechnicalError('member', TechnicalCause.NOT_EXIST)

    this.validate_owner(executor, executorPassword)
    let owner = this.members.get(executor)!
    owner.role = undefined

    this.members.get(member)!.role = 'owner'
    await this.save()

    return true
  }

  async changeName(this: DocumentType<Guild>, executor: string, name: string) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_PUBLIC_INFO)
    if (typeof name != 'string' || name.length == 0 || name.length > 20)
      throw new TechnicalError('tag', TechnicalCause.INVALID_FORMAT)
    this.public.name = name
    await this.save()

    return true
  }

  async changeTag(this: DocumentType<Guild>, executor: string, tag: string) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_PUBLIC_INFO)
    if (typeof tag != 'string' || tag.length == 0 || tag.length > 5)
      throw new TechnicalError('tag', TechnicalCause.INVALID_FORMAT)
    this.public.tag = tag
    await this.save()

    return true
  }

  async changeImage(this: DocumentType<Guild>, executor: string, ID: string) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_PUBLIC_INFO)
    this.public.profileImage = ID
    await this.save()

    return true
  }

  async changeTerms(
    this: DocumentType<Guild>,
    executor: string,
    terms: Partial<Terms>,
  ) {
    this.check_member_permissions(executor, PERMISSION.CHANGE_TERMS)
    if (typeof terms.private == 'boolean') this.terms.private = terms.private
    if (typeof terms.minimalGRI == 'number' && terms.minimalGRI > 0)
      this.terms.minimalGRI = terms.minimalGRI
    if (typeof terms.invitationOnly == 'boolean')
      this.terms.invitationOnly = terms.invitationOnly
    await this.save()

    return true
  }

  private async add_member(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    if (this.terms.minimalGRI && user.GRI < this.terms.minimalGRI)
      throw new TechnicalError('user GRI', TechnicalCause.NEED_HIGHER_VALUE)

    this.members.set(user.profile.username, { id: user._id, mpr: user.GRI })
    await this.save()

    user.guild = this
    await user.save()

    return true
  }

  private async store_request(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    if (this.terms.minimalGRI && user.GRI < this.terms.minimalGRI)
      throw new TechnicalError('user GRI', TechnicalCause.NEED_HIGHER_VALUE)

    this.private.requests.set(user.profile.username, {
      id: user._id,
      mpr: user.GRI,
    })
    await this.save()
    return true
  }

  private async store_invite(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    this.private.invites.set(user.profile.username, {
      id: user._id,
      mpr: user.GRI,
    })
    await this.save()

    user.guild = this
    await user.save()

    return true
  }

  private async add_by_invite(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    if (!this.private.invites.has(user.profile.username))
      throw new TechnicalError('invite', TechnicalCause.NOT_EXIST)
    this.members.set(
      user.profile.username,
      this.private.invites.get(user.profile.username)!,
    )
    this.private.invites.delete(user.profile.username)
    await this.save()
    return true
  }

  private async remove_member(name: string) {
    if (!this.members.has(name))
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    this.members.delete(name)
    return true
  }

  private async add_to_black_list(name: string) {
    if (this.members.has(name))
      throw new TechnicalError('user', TechnicalCause.ALREADY_EXIST)
    this.private.blackList.push(name)
    return true
  }

  private check_member_permissions(name: string, permission: PERMISSION) {
    let memberPermissions = this.get_member_permission(name)
    if (
      !memberPermissions ||
      !(
        memberPermissions.includes(PERMISSION.ALL) ||
        memberPermissions.includes(permission)
      )
    )
      throw new TechnicalError(
        'member permission',
        TechnicalCause.NEED_HIGHER_VALUE,
      )
  }

  private get_member_permission(name: string) {
    let member = this.members.get(name)
    if (!member || !member.role)
      throw new TechnicalError('member role', TechnicalCause.NEED_HIGHER_VALUE)
    let permissions = this.get_permissions(member.role)
    if (member.role && !permissions) member.role = undefined
    return permissions
  }

  private get_permissions(name: string | undefined) {
    if (!name) return
    return this.roles.get(name)
  }

  private change_role_name(old: string, updated: string) {
    if (old == 'owner')
      throw new TechnicalError('role', TechnicalCause.CAN_NOT_UPDATE)
    let permissions = this.roles.get(old)
    if (!permissions) throw new TechnicalError('role', TechnicalCause.NOT_EXIST)
    for (let member of this.members.values())
      if (member.role == old) member.role == updated

    this.roles.delete(old)
    this.roles.set(updated, permissions)
  }

  private change_role_permissions(
    name: string,
    newPermissions: PERMISSION[] | PERMISSION,
  ) {
    let permissions = this.roles.get(name)
    if (!permissions) throw new TechnicalError('role', TechnicalCause.NOT_EXIST)
    if (newPermissions instanceof Array) {
      if (newPermissions.includes(PERMISSION.ALL))
        throw new TechnicalError('role', TechnicalCause.CAN_NOT_UPDATE)
      this.roles.set(name, Array.from(new Set(newPermissions)))
      return true
    }

    if (newPermissions == PERMISSION.ALL)
      throw new TechnicalError('role', TechnicalCause.CAN_NOT_UPDATE)
    this.roles.set(name, Array.from(new Set(permissions).add(newPermissions)))
    return true
  }

  private static async get_guild_by_user(
    this: ReturnModelType<typeof Guild>,
    user: string,
  ) {
    let document = await UserModel.findByName(user)
    if (!document || !document.guild)
      throw new TechnicalError('user', TechnicalCause.INVALID)
    let guild = await this.findById(document.guild)
    if (!guild) throw new TechnicalError('guild', TechnicalCause.NOT_EXIST)

    return guild
  }

  private static async generate_test_document(
    this: ReturnModelType<typeof Guild>,
  ) {
    const owner = (await UserModel.generateTestData(1, false))[0]

    owner.profile.balance += PRICE_OF_GUILD_CREATION
    await owner.save()

    let [name, tag] = await Promise.all([
      this.get_random_name(),
      this.get_random_tag(),
    ])

    let guild = await this.create_guild(owner.profile.username, { name, tag })
    guild.public.GRI = getRandom(100, 2000)

    const users = await UserModel.generateTestData(5, false)
    for (let user of users) {
      switch (getRandom(1, 2)) {
        case 1:
          await guild.join(user.profile.username)
          break
        case 2:
          await guild.invite(owner.profile.username, user.profile.username)
          break
      }
    }

    return guild
  }

  private static async get_random_name(this: ReturnModelType<typeof Guild>) {
    let name: string = `test_${generateGuildName()}#${getRandom(1, 99)}`

    while (await this.findOne({ 'public.name': name }))
      name = `test_${generateGuildName()}_${getRandom(1, 99)}`

    return name
  }

  private static async get_random_tag(this: ReturnModelType<typeof Guild>) {
    let tag: string = `T#${getRandom(0, 9)}${getRandom(0, 9)}`

    while (await this.findOne({ 'public.tag': tag }))
      tag = `T#${getRandom(0, 9)}${getRandom(0, 9)}`

    return tag
  }

  private async validate_owner(
    this: DocumentType<Guild>,
    owner: string,
    password: string,
  ) {
    let member = this.members.get(owner)
    if (!member || member.role != 'owner')
      throw new TechnicalError('owner', TechnicalCause.INVALID)

    this.check_member_permissions(owner, PERMISSION.ALL)
    let document = await UserModel.findByName(owner)
    if (!document) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    document.validatePassword(password)
  }

  private async create_chat(this: DocumentType<Guild>) {
    this.private.chat = (await CLIENT_CHATS.spawn('guild', this._id)).id
  }
}
