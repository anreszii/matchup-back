import type { Match } from '../../Interfaces/index'
import { GuildModel, UserModel } from '../../Models/index'
import { v4 as uuid } from 'uuid'
import { MemberList } from './MemberList'
import { TechnicalCause, TechnicalError } from '../../error'

class PlayersManager implements Match.Member.Manager {
  private _players: MemberList = new MemberList()
  async spawn(name: string): Promise<Match.Member.Instance> {
    let guildName: string | undefined = undefined
    let id = uuid()

    let user = await UserModel.findByName(name)
    if (!user) throw new TechnicalError('user', TechnicalCause.NOT_EXIST)

    let guild = user.guild ? await GuildModel.findById(user.guild) : undefined
    if (guild) guildName = guild.public.name

    let member = {
      id,
      name,
      isReady: false,
      guildName,
      prefix: user.prefix,
    } as Match.Member.Instance

    this._players.addMember(member)
    return member
  }

  /**
   * @param entityID имя пользователя или его ID
   * @returns объект пользователя или undefined, если он не был найден
   */
  async get(entityID: string): Promise<Match.Member.Instance> {
    for (let member of this._players.toArray)
      if (member.id == entityID || member.name == entityID) return member
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
}

export const PLAYERS = new PlayersManager()
