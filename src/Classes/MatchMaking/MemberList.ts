import { List } from '../List'
import { UNDEFINED_MEMBER } from '../../configs/match_manager'
import type { Match } from '../../Interfaces'

export class MemberList extends List<Match.Member.Instance> {
  private _spectatorCount = 0
  private _firstCommandCount = 0
  private _secondCommandCount = 0
  private _neutralCount = 0
  private _captains: Map<
    Exclude<Match.Member.command, 'spectator' | 'neutral'>,
    Match.Member.Instance
  > = new Map()
  constructor(size?: number) {
    super(size, UNDEFINED_MEMBER)
  }

  public static isMember(member: unknown): member is Match.Member.Instance {
    if (!member || typeof member != 'object') return false
    return 'name' in member && 'command' in member && 'readyFlag' in member
  }

  public static isCommand(entity: unknown): entity is Match.Member.command {
    if (typeof entity != 'string' || !entity) return false
    if (entity == 'spectator') return true
    if (entity == 'neutral') return true
    if (entity == 'command1') return true
    if (entity == 'command2') return true
    return false
  }

  public add(...members: Array<Match.Member.Instance>): boolean {
    for (let index = 0; index < members.length; index++) {
      if (
        !this._hasFreeSpaceForMember(members[index]) ||
        this.hasMember(members[index])
      )
        return false
      this._increaseMemberTeamCounter(members[index].command)
    }

    super.add(...members)
    this._updateCaptains()
    return true
  }

  public delete(...members: Array<Match.Member.Instance>): boolean {
    if (!super.delete(...members)) return false
    for (let member of members.values()) this._decreaseMemberCounter(member)
    this._captains = new Map()
    this._updateCaptains()
    return true
  }

  public changeCommand(
    entity: string | Match.Member.Instance,
    command: Match.Member.command,
  ) {
    let member = this.getMember(entity)
    if (member == this._undefined) return false
    if (member.command == command) return true

    if (!this._hasFreeSpaceForMember(command)) return false

    this[`_${member.command}`]--
    this[`_${command}`]++

    member.command = command
    return true
  }

  public changeStatus(
    entity: string | Match.Member.Instance,
    readyFlag: boolean,
  ) {
    let member = this.getMember(entity)
    if (member == this._undefined) return false

    member.readyFlag = readyFlag
    return true
  }

  public getMember(
    entity: string | Match.Member.Instance,
  ): Match.Member.Instance {
    if (typeof entity == 'string') {
      let member = this._elements.find((_member) => _member?.name == entity)
      if (!member) return UNDEFINED_MEMBER
      return member
    }
    let index = this._getElement(entity)
    if (!~index) return UNDEFINED_MEMBER
    return this._elements[index] as Match.Member.Instance
  }

  /**
   *
   * @param entity имя участника или объект участника. От этого скорость не зависит
   * @returns наличие участника в хранилище
   */
  public hasMember(entity: string | Match.Member.Instance): boolean {
    let name = typeof entity == 'string' ? entity : entity.name
    for (var i = 0; i < this._elements.length; i++)
      if (this._elements[i]?.name == name) return true
    return false
  }

  public get captainOfFirstCommand() {
    return this._captains.get('command1')
  }

  public get captainOfSecondCommand() {
    return this._captains.get('command2')
  }

  public get currentUndefined() {
    return this._undefined
  }

  /**
   * Число всех участников лобби
   */
  public get quantityOfMembers() {
    return this.quantityOfPlayers + this.quantityOfSpectators
  }

  /**
   * Число наблюдателей
   */
  public get quantityOfSpectators() {
    return this._spectatorCount
  }

  /**
   * Сумма всех игроков, включая неопределившихся
   */
  public get quantityOfPlayers() {
    return (
      this._firstCommandCount + this._secondCommandCount + this._neutralCount
    )
  }

  /**
   * Число игроков первой команды
   */
  public get quantityOfFirstCommandMembers() {
    return this._firstCommandCount
  }

  /**
   * Число игроков второй команды
   */
  public get quantityOfSecondCommandMembers() {
    return this._secondCommandCount
  }

  /**
   * Число неопределившихся игроков
   */
  public get quantityOfNeutralPlayers() {
    return this._neutralCount
  }

  /**
   * Массив всех игроков, включая неопределившихся
   */
  public get players() {
    let players: Array<Match.Member.Instance> = Array()
    for (let member of this._elements)
      if (member!.command != 'spectator') players.push(member!)
    return players
  }

  /**
   * Массив наблюдателей
   */
  public get spectators() {
    let players: Array<Match.Member.Instance> = []
    for (let member of this._elements)
      if (member?.command == 'spectator') players.push(member!)
    return players
  }

  public get command1() {
    let members = []
    for (let member of this._elements) {
      if (member?.command == 'command1') members.push(member)
    }

    return members
  }

  public get command2() {
    let members = []
    for (let member of this._elements) {
      if (member?.command == 'command2') members.push(member)
    }

    return members
  }

  /**
   * Массив всех участников матча
   */
  public get toArray() {
    return this._elements
  }

  private _increaseMemberTeamCounter(command: Match.Member.command) {
    return command == 'spectator'
      ? this._increaseSpectatorCounter()
      : this._increasePlayerCounter(command)
  }

  private _increasePlayerCounter(
    command: Exclude<Match.Member.command, 'spectator'>,
  ) {
    this[`_${command}`]++
  }

  private _increaseSpectatorCounter() {
    this._spectatorCount++
  }

  private _decreaseMemberCounter(member: Match.Member.Instance) {
    return member.command == 'spectator'
      ? this._decreaseSpectatorCounter()
      : this._decreasePlayerCounter(member.command)
  }

  private _decreasePlayerCounter(
    command: Exclude<Match.Member.command, 'spectator'>,
  ) {
    this[`_${command}`]--
  }

  private _decreaseSpectatorCounter() {
    this._spectatorCount--
  }

  private _hasFreeSpaceForMember(
    entity: Match.Member.Instance | Match.Member.command,
  ) {
    let command = typeof entity == 'string' ? entity : entity.command
    return command == 'spectator'
      ? this._hasFreeSpaceForSpectaror()
      : this._hasFreeSpaceForPlayer(command)
  }

  private _hasFreeSpaceForPlayer(
    command: Exclude<Match.Member.command, 'spectator'>,
  ) {
    if (command == 'neutral') return this.quantityOfPlayers < 10
    return this._hasFreeSpaceInCommand(command)
  }

  private _hasFreeSpaceInCommand(
    command: Exclude<Match.Member.command, 'neutral' | 'spectator'>,
  ) {
    return this[`_${command}`] < 5
  }

  private _hasFreeSpaceForSpectaror() {
    return this.quantityOfSpectators < 5
  }

  private _updateCaptains() {
    for (let member of this.values()) {
      if (member.command == 'neutral' || member.command == 'spectator') continue
      let commandCaptain = this._captains.get(member.command)
      if (!commandCaptain || commandCaptain.GRI < member.GRI)
        this._captains.set(member.command, member)
    }
  }

  private get _memberWithHighestGRI() {
    let tmp: Match.Member.Instance = UNDEFINED_MEMBER

    for (let member of this._elements) {
      if (member != this._undefined)
        if (member!.GRI > tmp.GRI) tmp = member as Match.Member.Instance
    }

    return tmp
  }

  private get _command1() {
    return this._firstCommandCount
  }

  private get _command2() {
    return this._secondCommandCount
  }

  private get _spectator() {
    return this._spectatorCount
  }

  private get _neutral() {
    return this._neutralCount
  }

  private set _command1(value) {
    this._firstCommandCount = value
  }

  private set _command2(value) {
    this._secondCommandCount = value
  }

  private set _neutral(value) {
    this._neutralCount = value
  }

  private set _spectator(value) {
    this._spectatorCount = value
  }
}
