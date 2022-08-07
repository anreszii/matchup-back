import { List } from '../Classes/List'
import { UNDEFINED_MEMBER } from '../configs/match_manager'
import type { command, Member } from './Lobby'

export class MemberList extends List<Member> {
  private _spectator = 0
  private _command1 = 0
  private _command2 = 0
  private _neutral = 0
  constructor(size?: number) {
    super(size, UNDEFINED_MEMBER)
  }

  public get currentUndefined() {
    return this._undefined
  }

  public get quantityOfSpectators() {
    return this._spectator
  }

  public get quantityOfPlayers() {
    return this._command1 + this._command2 + this._neutral
  }

  public get quantityOfFirstCommandMembers() {
    return this._command1
  }

  public get quantityOfSecondCommandMembers() {
    return this._command2
  }

  public get quantityOfNeutralMembers() {
    return this._neutral
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

  public add(...members: Member[]): boolean {
    for (let member of members.values()) {
      if (!this._hasFreeSpaceForMember(member) || this.hasMember(member))
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

  public changeCommand(entity: string | Member, command: command) {
    let member = this.getMember(entity)
    if (member == this._undefined) return false
    if (member.command == command) return true

    if (!this._hasFreeSpaceForMember(command)) return false

    this[member.command]--
    this[command]++

    member.command = command
    return true
  }

  public changeStatus(entity: string | Member, readyFlag: boolean) {
    let member = this.getMember(entity)
    if (member == this._undefined) return false

    member.readyFlag = readyFlag
    return true
  }

  public getMember(entity: string | Member): Member {
    if (typeof entity == 'string') {
      let member = this._elements.find((_member) => _member?.name == entity)
      if (!member) return UNDEFINED_MEMBER
      return member
    }
    let index = this._getElement(entity)
    if (!~index) return UNDEFINED_MEMBER
    return this._elements[index] as Member
  }

  public hasMember(entity: string | Member): boolean {
    let name = typeof entity == 'string' ? entity : entity.name
    for (var i = 0; i < this._elements.length; i++)
      if (this._elements[i]?.name == name) return true
    return false
  }

  public static isMember(member: unknown): member is Member {
    if (!member || typeof member != 'object') return false
    return 'name' in member && 'command' in member && 'readyFlag' in member
  }

  public static isCommand(entity: unknown): entity is command {
    if (typeof entity != 'string' || !entity) return false
    if (entity == 'spectator') return true
    if (entity == 'neutral') return true
    if (entity == 'command1') return true
    if (entity == 'command2') return true
    return false
  }

  private get command1() {
    return this._command1
  }

  private get command2() {
    return this._command2
  }

  private get neutral() {
    return this._neutral
  }

  private get spectator() {
    return this._spectator
  }

  private set command1(value) {
    this._command1 = value
  }

  private set command2(value) {
    this._command2 = value
  }

  private set neutral(value) {
    this._neutral = value
  }

  private set spectator(value) {
    this._spectator = value
  }

  private _increaseMemberCounter(member: Member) {
    return member.command == 'spectator'
      ? this._increaseSpectatorCounter()
      : this._increasePlayerCounter(member.command)
  }

  private _increasePlayerCounter(command: Exclude<command, 'spectator'>) {
    this[command]++
  }

  private _increaseSpectatorCounter() {
    this.spectator++
  }

  private _decreaseMemberCounter(member: Member) {
    return member.command == 'spectator'
      ? this._decreaseSpectatorCounter()
      : this._decreasePlayerCounter(member.command)
  }

  private _decreasePlayerCounter(command: Exclude<command, 'spectator'>) {
    this[command]--
  }

  private _decreaseSpectatorCounter() {
    this.spectator--
  }

  private _hasFreeSpaceForMember(entity: Member | command) {
    let command = typeof entity == 'string' ? entity : entity.command
    return command == 'spectator'
      ? this._hasFreeSpaceForSpectaror()
      : this._hasFreeSpaceForPlayer(command)
  }

  private _hasFreeSpaceForPlayer(command: Exclude<command, 'spectator'>) {
    if (command == 'neutral') return this.quantityOfPlayers < 10
    return this._hasFreeSpaceInCommand(command)
  }

  private _hasFreeSpaceInCommand(
    command: Exclude<command, 'neutral' | 'spectator'>,
  ) {
    return this[command] < 5
  }

  private _hasFreeSpaceForSpectaror() {
    return this.quantityOfSpectators < 5
  }
}
