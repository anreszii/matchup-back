import { List } from '../Classes/List'
import { UNDEFINED_MEMBER } from '../configs/match_manager'
import type { Member } from './Lobby'

export class MemberList extends List<Member> {
  private _spectators = 0
  private _players = 0
  constructor(size?: number) {
    super(size, UNDEFINED_MEMBER)
  }

  public add(...members: Member[]): boolean {
    for (let member of members.values()) {
      if (!this._hasFreeSpaceForMember(member)) return false
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

  public get quantityOfSpectators() {
    return this._spectators
  }

  public get quantityOfPlayers() {
    return this._players
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

  private _increaseMemberCounter(member: Member) {
    return member.command == 'spectator'
      ? this._increaseSpectatorCounter()
      : this._increasePlayerCounter()
  }

  private _increasePlayerCounter() {
    this._players++
  }

  private _increaseSpectatorCounter() {
    this._spectators++
  }

  private _decreaseMemberCounter(member: Member) {
    return member.command == 'spectator'
      ? this._decreaseSpectatorCounter()
      : this._decreasePlayerCounter()
  }

  private _decreasePlayerCounter() {
    this._players--
  }

  private _decreaseSpectatorCounter() {
    this._spectators--
  }

  private _hasFreeSpaceForMember(member: Member) {
    return member.command == 'spectator'
      ? this._hasFreeSpaceForSpectaror()
      : this._hasFreeSpaceForPlayer()
  }

  private _hasFreeSpaceForPlayer() {
    return this._players < 10
  }

  private _hasFreeSpaceForSpectaror() {
    return this._spectators < 5
  }
}
