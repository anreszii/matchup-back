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
    default: new Array(),
    type: () => GuildMemberData,
  })
  members!: Array<GuildMemberData>

  static async createGuild(
    this: ReturnModelType<typeof Guild>,
    owner: string,
    info: PartialInfoWithRequiredNameAndTag,
    terms?: Partial<Terms>,
  ) {
    const user = await UserModel.findByName(owner)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    if (user.guild != undefined)
      throw new TechnicalError('user', TechnicalCause.INVALID)

    const { name, tag, description } = info
    if (!name || !tag || tag.length >= 5)
      throw new TechnicalError(
        'guild public info',
        TechnicalCause.INVALID_FORMAT,
      )

    if (!(await user.is_premium())) {
      user.buy(PRICE_OF_GUILD_CREATION)
      await user.save()
    }

    const guild = new this()
    await guild.__create_chat()

    guild.public.name = name
    guild.public.tag = tag
    if (typeof description == 'string') guild.public.description = description

    guild.terms = new Terms()
    guild.members.push({
      id: user._id,
      name: user.profile.username,
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
    let guild = await this.__get_guild_by_user(owner)
    await guild.__validate_owner(owner, password)

    await this.deleteOne({ _id: guild._id })
    return true
  }

  static async generateTestData(
    this: ReturnModelType<typeof Guild>,
    testDocumentsCount: number = 1,
  ) {
    let guilds = []
    for (let i = 1; i < testDocumentsCount + 1; i++)
      guilds.push(await this.__generate_test_document())

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
    if (this.members.length >= 50)
      throw new TechnicalError('members', TechnicalCause.NEED_LOWER_VALUE)
    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    if (!this.terms.private) return this.__add_member(user)
    if (!this.terms.invitationOnly) return this.__store_request(user)
    return this.__add_by_invite(user)
  }

  async leave(this: DocumentType<Guild>, name: string) {
    this.__remove_member(name)
    return this.save().then(
      () => true,
      () => false,
    )
  }

  async invite(this: DocumentType<Guild>, executor: string, name: string) {
    this.__check_member_permissions(executor, PERMISSION.INVITE)
    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    user.notify(`Вас пригласили в клан ${this.public.name}`)

    return this.__store_invite(user)
  }

  async acceptRequest(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
  ) {
    this.__check_member_permissions(executor, PERMISSION.ACCEPT_REQUEST)
    if (!__has(name, this.private.requests))
      throw new TechnicalError('request', TechnicalCause.NOT_EXIST)

    __move(name, this.private.requests, this.members)

    return this.save().then(
      () => {
        return UserModel.findByName(name).then(
          (user) => {
            if (!user) return false
            user.notify(`Ваш запрос в клан ${this.public.name} принят`)
            return true
          },
          () => false,
        )
      },
      () => false,
    )
  }

  async rejectRequest(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
  ) {
    this.__check_member_permissions(executor, PERMISSION.ACCEPT_REQUEST)
    if (!__has(name, this.private.requests))
      throw new TechnicalError('request', TechnicalCause.NOT_EXIST)

    __delete(name, this.private.requests)

    return this.save().then(
      () => {
        return UserModel.findByName(name).then(
          (user) => {
            if (!user) return false
            user.notify(`Ваш запрос в клан ${this.public.name} отклонен`)
            return true
          },
          () => false,
        )
      },
      () => false,
    )
  }

  async kick(this: DocumentType<Guild>, executor: string, name: string) {
    this.__check_member_permissions(executor, PERMISSION.KICK)
    this.__remove_member(name)
    return this.save().then(
      () => true,
      () => false,
    )
  }

  async ban(this: DocumentType<Guild>, executor: string, name: string) {
    this.__check_member_permissions(executor, PERMISSION.KICK)
    this.__check_member_permissions(executor, PERMISSION.CHANGE_BLACK_LIST)
    this.__remove_member(name)
    this.__add_to_black_list(name)
    await this.save()
    return true
  }

  async addToBlackList(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
  ) {
    this.__check_member_permissions(executor, PERMISSION.CHANGE_BLACK_LIST)
    this.__add_to_black_list(name)
    await this.save()
    return true
  }

  async createRole(
    this: DocumentType<Guild>,
    executor: string,
    name: string,
    permissions: PERMISSION[],
  ) {
    this.__check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
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
    this.__check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
    let role = this.roles.get(name)
    if (!role) throw new TechnicalError('role', TechnicalCause.NOT_EXIST)
    if (newRole.name) this.__change_role_name(name, newRole.name)
    if (newRole.permissions)
      this.__change_role_permissions(name, newRole.permissions)

    await this.save()
    return true
  }

  async deleteRole(this: DocumentType<Guild>, executor: string, name: string) {
    this.__check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
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
    this.__check_member_permissions(executor, PERMISSION.CHANGE_ROLES)
    if (role == 'owner')
      throw new TechnicalError('role', TechnicalCause.CAN_NOT_UPDATE)
    if (!this.roles.has(role))
      throw new TechnicalError('role', TechnicalCause.NOT_EXIST)
    if (!__has(member, this.members))
      throw new TechnicalError('member', TechnicalCause.NOT_EXIST)

    __get(member, this.members)!.member.role = role
    await this.save()

    return true
  }

  async changeOwner(
    this: DocumentType<Guild>,
    executor: string,
    executorPassword: string,
    member: string,
  ) {
    if (!__has(executor, this.members) || !__has(member, this.members))
      throw new TechnicalError('member', TechnicalCause.NOT_EXIST)

    this.__validate_owner(executor, executorPassword)
    __get(executor, this.members)!.member.role = undefined
    __get(member, this.members)!.member.role = 'owner'
    await this.save()

    return true
  }

  async changeName(this: DocumentType<Guild>, executor: string, name: string) {
    this.__check_member_permissions(executor, PERMISSION.CHANGE_PUBLIC_INFO)
    if (typeof name != 'string' || name.length == 0 || name.length > 20)
      throw new TechnicalError('tag', TechnicalCause.INVALID_FORMAT)
    this.public.name = name
    await this.save()

    return true
  }

  async changeTag(this: DocumentType<Guild>, executor: string, tag: string) {
    this.__check_member_permissions(executor, PERMISSION.CHANGE_PUBLIC_INFO)
    if (typeof tag != 'string' || tag.length == 0 || tag.length > 5)
      throw new TechnicalError('tag', TechnicalCause.INVALID_FORMAT)
    this.public.tag = tag
    await this.save()

    return true
  }

  async changeImage(this: DocumentType<Guild>, executor: string, ID: string) {
    this.__check_member_permissions(executor, PERMISSION.CHANGE_PUBLIC_INFO)
    this.public.profileImage = ID
    await this.save()

    return true
  }

  async changeTerms(
    this: DocumentType<Guild>,
    executor: string,
    terms: Partial<Terms>,
  ) {
    this.__check_member_permissions(executor, PERMISSION.CHANGE_TERMS)
    if (typeof terms.private == 'boolean') this.terms.private = terms.private
    if (typeof terms.minimalGRI == 'number' && terms.minimalGRI > 0)
      this.terms.minimalGRI = terms.minimalGRI
    if (typeof terms.invitationOnly == 'boolean')
      this.terms.invitationOnly = terms.invitationOnly
    await this.save()

    return true
  }

  private async __add_member(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    if (this.terms.minimalGRI && user.GRI < this.terms.minimalGRI)
      throw new TechnicalError('user GRI', TechnicalCause.NEED_HIGHER_VALUE)

    __add(
      { id: user._id, mpr: user.GRI, name: user.profile.username },
      this.members,
    )

    return this.save().then(
      () => {
        user.guild = this
        return user.save().then(
          () => true,
          () => false,
        )
      },
      () => false,
    )
  }

  private async __store_request(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    if (this.terms.minimalGRI && user.GRI < this.terms.minimalGRI)
      throw new TechnicalError('user GRI', TechnicalCause.NEED_HIGHER_VALUE)

    __add(
      {
        id: user._id,
        name: user.profile.username,
        mpr: user.GRI,
      },
      this.private.requests,
    )

    return this.save().then(
      () => true,
      () => false,
    )
  }

  private async __store_invite(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    __add(
      {
        id: user._id,
        name: user.profile.username,
        mpr: user.GRI,
      },
      this.private.invites,
    )

    return this.save().then(
      () => {
        user.guild = this
        return user.save().then(
          () => true,
          () => false,
        )
      },
      () => false,
    )
  }

  private async __add_by_invite(
    this: DocumentType<Guild>,
    user: DocumentType<User>,
  ) {
    if (!__has(user.profile.username, this.private.invites))
      throw new TechnicalError('invite', TechnicalCause.NOT_EXIST)
    __move(user.profile.username, this.private.invites, this.members)
    return this.save().then(
      () => true,
      () => false,
    )
  }

  private async __remove_member(name: string) {
    if (!__has(name, this.members))
      throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    __delete(name, this.members)
    return true
  }

  private async __add_to_black_list(name: string) {
    if (__has(name, this.members))
      throw new TechnicalError('user', TechnicalCause.ALREADY_EXIST)
    this.private.blackList.push(name)
    return true
  }

  private __check_member_permissions(name: string, permission: PERMISSION) {
    let memberPermissions = this.__get_member_permission(name)
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

  private __get_member_permission(name: string) {
    let member = __get(name, this.members)?.member
    if (!member || !member.role)
      throw new TechnicalError('member role', TechnicalCause.NEED_HIGHER_VALUE)
    let permissions = this.__get_permissions(member.role)
    if (member.role && !permissions) member.role = undefined
    return permissions
  }

  private __get_permissions(name: string | undefined) {
    if (!name) return
    return this.roles.get(name)
  }

  private __change_role_name(old: string, updated: string) {
    if (old == 'owner')
      throw new TechnicalError('role', TechnicalCause.CAN_NOT_UPDATE)
    let permissions = this.roles.get(old)
    if (!permissions) throw new TechnicalError('role', TechnicalCause.NOT_EXIST)
    for (let member of this.members.values())
      if (member.role == old) member.role == updated

    this.roles.delete(old)
    this.roles.set(updated, permissions)
  }

  private __change_role_permissions(
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

  private static async __get_guild_by_user(
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

  private static async __generate_test_document(
    this: ReturnModelType<typeof Guild>,
  ) {
    const owner = (await UserModel.generateTestData(1, false))[0]

    owner.profile.balance += PRICE_OF_GUILD_CREATION
    await owner.save()

    let [name, tag] = await Promise.all([
      this.__get_random_name(),
      this.__get_random_tag(),
    ])

    let guild = await this.createGuild(owner.profile.username, { name, tag })
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

  private static async __get_random_name(this: ReturnModelType<typeof Guild>) {
    let name: string = `test_${generateGuildName()}#${getRandom(1, 99)}`

    while (await this.findOne({ 'public.name': name }))
      name = `test_${generateGuildName()}_${getRandom(1, 99)}`

    return name
  }

  private static async __get_random_tag(this: ReturnModelType<typeof Guild>) {
    let tag: string = `T#${getRandom(0, 9)}${getRandom(0, 9)}`

    while (await this.findOne({ 'public.tag': tag }))
      tag = `T#${getRandom(0, 9)}${getRandom(0, 9)}`

    return tag
  }

  private async __validate_owner(
    this: DocumentType<Guild>,
    owner: string,
    password: string,
  ) {
    let member = __get(owner, this.members)?.member
    if (!member || member.role != 'owner')
      throw new TechnicalError('owner', TechnicalCause.INVALID)

    this.__check_member_permissions(owner, PERMISSION.ALL)
    let document = await UserModel.findByName(owner)
    if (!document) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)
    document.validatePassword(password)
  }

  private async __create_chat(this: DocumentType<Guild>) {
    this.private.chat = (await CLIENT_CHATS.spawn('guild', this._id)).id
  }
}

function __move(name: string, from: GuildMemberData[], to: GuildMemberData[]) {
  const member = __get(name, from)?.member
  if (!member) return

  __delete(name, from)
  to.push(member)
}

function __add(member: GuildMemberData, list: GuildMemberData[]) {
  list.push(member)
}

function __has(name: string, list: GuildMemberData[]) {
  for (let member of list) if (member.name == name) return true
  return false
}

function __get(
  name: string,
  list: GuildMemberData[],
): { index: number; member: GuildMemberData } | undefined {
  for (const [index, request] of list.entries())
    if (request.name == name) return { index, member: request }
}

function __delete(name: string, list: GuildMemberData[]) {
  for (let index of list.keys())
    if (list[index].name == name) list.splice(index, 1)
}
