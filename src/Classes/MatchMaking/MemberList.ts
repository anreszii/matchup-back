import { UNDEFINED_MEMBER } from '../../configs/match_manager'
import type { Match } from '../../Interfaces/index'
import { OneTypeArray } from '../OneTypeArray'
import { COMMANDS } from './Command/Manager'

export class MemberList
  extends OneTypeArray<Match.Member.Instance>
  implements Match.Member.List
{
  constructor() {
    super(20, UNDEFINED_MEMBER)
  }

  private _membersCount = 0
  private _keyGuild?: string

  public addMember(member: Match.Member.Instance) {
    let index = super.addOne(member)
    if (!~index) return false

    this._membersCount++
    this._checkGuildAfterJoin(member)
    return true
  }

  public deleteMember(name: string): boolean {
    let member = this.getByName(name)
    if (!member) return false

    let deletedCount = super.delete(member)
    if (!~deletedCount) return false
    this._checkGuildAfterLeave()
    return true
  }

  hasMember(name: string): boolean {
    for (let i = 0; i < this._elements.length; i++)
      if (this._elements[i]?.name == name) return true
    return false
  }

  /**
   * Поиск пользователя внутри списка
   *
   * @param name имя пользователя, которого нужно найти
   * @returns объект пользователя в случае успешного поиска или null, если пользователя нет в списке
   */
  getByName(name: string) {
    let members = this.toArray
    for (let i = 0; i < members.length; i++)
      if (members[i].name == name) return members[i]
    return null
  }

  isMember(entity: unknown): entity is Match.Member.Instance {
    if (!entity || typeof entity != 'object') return false
    return (
      'name' in entity &&
      'command' in entity &&
      'readyFlag' in entity &&
      'GRI' in entity &&
      'guildName' in entity
    )
  }

  get count(): number {
    return this.toArray.length
  }

  get isGuild(): boolean {
    return Boolean(this._keyGuild)
  }

  get players(): Match.Member.Instance[] {
    let members: Match.Member.Instance[] = []
    for (let member of this.toArray) {
      const ID = member?.commandID
      if (!ID) continue

      let command = COMMANDS.get(ID)
      if (command && command.type.includes('command')) members.push(member)
    }

    return members
  }

  get spectators(): Match.Member.Instance[] {
    let members: Match.Member.Instance[] = []
    for (let member of this.toArray) {
      const ID = member?.commandID
      if (!ID) continue

      let command = COMMANDS.get(ID)
      if (command && command.type == 'spectators') members.push(member)
    }

    return members
  }

  get spectatorsCount(): number {
    let count = 0
    for (let member of this.toArray) {
      const ID = member?.commandID
      if (!ID) continue

      let command = COMMANDS.get(ID)
      if (command && command.type == 'spectators') count++
    }

    return count
  }

  get playersCount(): number {
    let count = 0
    for (let member of this.toArray) {
      const ID = member?.commandID
      if (!ID) continue

      let command = COMMANDS.get(ID)
      if (command && command.type.includes('command')) count++
    }

    return count
  }

  private _checkGuildAfterLeave() {
    let members = this.toArray
    this._keyGuild = members[0].guildName
    for (let i = 1; i < members.length; i++)
      if (members[i].guildName != this._keyGuild)
        return (this._keyGuild = undefined)
  }

  private _checkGuildAfterJoin(member: Match.Member.Instance) {
    if (this._membersCount == 0) {
      this._keyGuild = member.guildName
      return
    }
    if (this._keyGuild != member.guildName) this._keyGuild = undefined
  }
}
