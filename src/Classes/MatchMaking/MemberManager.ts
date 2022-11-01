import type { Match } from '../../Interfaces/index'
import { validationCause, ValidationError } from '../../error'
import { GuildModel, UserModel } from '../../Models/index'
import { v4 as uuid } from 'uuid'
import { MemberList } from './MemberList'

class PlayersManager implements Match.Member.Manager {
  private _players: MemberList = new MemberList()
  async spawn(name: string): Promise<Match.Member.Instance> {
    let guildName: string | undefined = undefined
    let id = uuid()

    let user = await UserModel.findByName(name)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)

    let guild = user.guild ? await GuildModel.findById(user.guild) : undefined
    if (guild) guildName = guild.info.name

    let member = {
      id,
      name,
      readyFlag: false,
      guildName,
    } as Match.Member.Instance

    this._players.addMember(member)
    return member
  }

  /**
   * @param entityID имя пользователя или его ID
   * @returns объект пользователя или undefined, если он не был найден
   */
  get(entityID: string): Match.Member.Instance | undefined {
    for (let member of this._players.toArray)
      if (member.id == entityID || member.name == entityID) return member
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

  /**
   * @param entityID имя пользоваетля или его ID
   * @returns статус операции удаления пользователя
   */
  drop(entityID: string): boolean {
    let member = this.get(entityID)
    if (!member) return true

    return Boolean(this._players.delete(member))
  }
}

export const PLAYERS = new PlayersManager()
