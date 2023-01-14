import type { Match } from '../../Interfaces/index'
import { GuildModel, User, UserModel } from '../../Models/index'
import { v4 as uuid } from 'uuid'
import { MemberList } from './MemberList'
import { TechnicalCause, TechnicalError } from '../../error'
import { SECOND_IN_MS } from '../../configs/time_constants'

class PlayersManager implements Match.Member.Manager {
  private _players: MemberList = new MemberList()
  construcror() {
    setInterval(this._syncMembers.bind(this), SECOND_IN_MS * 30)
  }
  async spawn(name: string): Promise<Match.Member.Instance> {
    let guildName: string | undefined = undefined
    let id = uuid()

    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    let guild = user.guild ? await GuildModel.findById(user.guild) : undefined
    if (guild) guildName = guild.public.name

    let discordNick = user.profile.discord_nickname
    if (!discordNick) discordNick = user.profile.username
    let nick = user.profile.nickname
    if (!nick) nick = 'undefined'
    let member = {
      id,
      name,
      nick,
      isReady: false,
      GRI: user.GRI,
      guildName,
      discordNick,
      prefix: user.prefix,
      notify: user.notify.bind(user),
    } as Match.Member.Instance

    this._players.addMember(member as Match.Member.Instance)
    return member
  }

  /**
   * @param entityID имя пользователя или его ID
   * @returns объект пользователя или undefined, если он не был найден
   */
  async get(entityID: string): Promise<Match.Member.Instance> {
    for (let member of this._players.toArray)
      if (member.id == entityID || member.name == entityID)
        return member as Match.Member.Instance
    return this.spawn(entityID)
  }

  /**
   * @param entityID имя пользователя или его ID
   * @returns есть ли пользователь в пуле
   */
  has(entityID: string): boolean {
    for (let member of this._players.toArray)
      if (member.id == entityID || member.name == entityID) return true
    return false
  }

  becomeReady(name: string): boolean {
    let member = this._players.getByName(name)
    if (!member) return false

    member.isReady = true
    return true
  }

  becomeUnready(name: string): boolean {
    let member = this._players.getByName(name)
    if (!member) return false

    member.isReady = false
    return true
  }

  /**
   * @param entityID имя пользоваетля или его ID
   * @returns статус операции удаления пользователя
   */
  async drop(entityID: string): Promise<boolean> {
    let member = await this.get(entityID)
    if (!member) return true

    return Boolean(this._players.delete(member))
  }

  private async _syncMembers() {
    const names = []
    const members: Match.Member.Instance[] = []
    for (let member of this._players.values()) {
      names.push(member.name)
      members.push(member)
    }

    UserModel.find({ 'profile.username': names }).then((users) => {
      for (let user of users) {
        let member = members.find(
          (member) => member.name == user.profile.username,
        )
        if (!member) continue

        member.GRI = user.GRI
        member.prefix = user.prefix

        GuildModel.findById(user.guild)
          .then((guild) => {
            if (!guild) member!.guildName = undefined
            else member!.guildName = guild.public.name
          })
          .catch((e) => console.error(e))
      }
    })
  }
}

export const PLAYERS = new PlayersManager()
