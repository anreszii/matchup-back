import { List } from '../Classes/List'
import { UNDEFINED_MEMBER } from '../configs/match_manager'
import type { command, Member } from './Lobby'

export class MemberList extends List<Member> {
  private _spectators = 0
  private _players = {
    command1: 0,
    command2: 0,
    neutral: 0,
  }
  constructor(size?: number) {
    super(size, UNDEFINED_MEMBER)
  }

  public add(...members: Member[]): boolean {
    for (let member of members.values()) {
      if (!this._hasFreeSpaceForMember(member) || this._hasMember(member))
        return false
      this._increaseMemberCounter(member)
    }

    super.add(...members)
    return true
  }

  public delete(...members: Member[]): boolean {
    if (!super.delete(...members)) return false
    for (let member of members.values()) this._decreaseMemberCounter(member)
    return true
  }

  public getMember(entity: string | Member) {
    let name = typeof entity == 'string' ? entity : entity.name
    let member = this._elements.find((_member) => _member?.name == name)
    if (!member) return UNDEFINED_MEMBER
    return member
  }

  public get quantityOfSpectators() {
    return this._spectators
  }

  public get quantityOfPlayers() {
    return (
      this._players.command1 + this._players.command2 + this._players.neutral
    )
  }

  public get players() {
    let players: Array<Member> = Array()
    for (let member of this._elements)
      if (member!.command != 'spectator') players.push(member!)
    return players
  }

  public get spectators() {
    let players: Array<Member> = Array()
    for (let member of this._elements)
      if (member!.command == 'spectator') players.push(member!)
    return players
  }

  public static isMember(member: unknown): member is Member {
    if (!member || typeof member != 'object') return false
    return 'name' in member && 'command' in member && 'readyFlag' in member
  }

  private _increaseMemberCounter(member: Member) {
    return member.command == 'spectator'
      ? this._increaseSpectatorCounter()
      : this._increasePlayerCounter(member.command)
  }

  private _increasePlayerCounter(command: Exclude<command, 'spectator'>) {
    this._players[command]++
  }

  private _increaseSpectatorCounter() {
    this._spectators++
  }

  private _decreaseMemberCounter(member: Member) {
    return member.command == 'spectator'
      ? this._decreaseSpectatorCounter()
      : this._decreasePlayerCounter(member.command)
  }

  private _decreasePlayerCounter(command: Exclude<command, 'spectator'>) {
    this._players[command]--
  }

  private _decreaseSpectatorCounter() {
    this._spectators--
  }

  private _hasMember(entity: string | Member): boolean {
    let name = typeof entity == 'string' ? entity : entity.name
    for (var i = 0; i < this._elements.length; i++)
      if (this._elements[i]?.name == name) return true
    return false
  }

  private _hasFreeSpaceForMember(member: Member) {
    return member.command == 'spectator'
      ? this._hasFreeSpaceForSpectaror()
      : this._hasFreeSpaceForPlayer(member.command)
  }

  private _hasFreeSpaceForPlayer(command: Exclude<command, 'spectator'>) {
    let status = command == 'neutral' ? true : this._players[command] < 5
    return this.quantityOfPlayers < 10 && status
  }

  private _hasFreeSpaceForSpectaror() {
    return this.quantityOfSpectators < 5
  }
}
