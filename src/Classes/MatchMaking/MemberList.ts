import type { Match } from '../../Interfaces/index'
import { UNDEFINED_MEMBER } from '../../configs/match_manager'
import { OneTypeArray } from '../OneTypeArray'

export class MemberList
  extends OneTypeArray<Match.Member.InstanceData>
  implements Match.Member.List
{
  constructor() {
    super(20, UNDEFINED_MEMBER)
  }

  private _membersCount = 0

  public addMember(member: Match.Member.Instance) {
    let index = super.addOne(member)
    if (!~index) return false

    this._membersCount++
    return true
  }

  public deleteMember(name: string): boolean {
    let member = this.getByName(name)
    if (!member) return false

    let deletedCount = super.delete(member)
    if (!~deletedCount) return false
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

  get members(): Match.Member.InstanceData[] {
    let members: Match.Member.InstanceData[] = []
    for (let member of this.toArray) {
      const ID = member?.commandID
      if (!ID) continue

      members.push(member)
    }

    return members
  }

  get membersCount(): number {
    let count = 0
    for (let member of this.toArray) {
      const ID = member?.commandID
      if (!ID) continue

      count++
    }

    return count
  }
}
