import { matchCause, MatchError } from '../error'
import { MemberList } from './MemberList'

import { v4 as uuid } from 'uuid'
import type {
  MatchController,
  matchStatus,
} from './Controllers/MatchController'

export type command = 'spectator' | 'neutral' | 'command1' | 'command2'

export type Member = {
  name: string
  command: command
  readyFlag: boolean
}

export declare interface MatchLobby {
  get id(): string
  get status(): matchStatus
  start(): Promise<boolean>
  stop(): Promise<boolean>
  addMember(member: Member): Promise<boolean>
  removeMember(member: Member): Promise<boolean>
  updateMember(
    member: Required<Pick<Member, 'name'>> & Partial<Omit<Member, 'name'>>,
  ): Promise<boolean>
  changeCommand(member: Member | string, command: command): Promise<boolean>
  changeStatus(member: Member | string, readyFlag: boolean): Promise<boolean>
}

export class LobbyManager {
  private static _lobbyList: Map<string, Lobby> = new Map()

  public static async spawn(controller: MatchController): Promise<Lobby> {
    const ID = this.createID()
    if (!(await controller.create()))
      throw new MatchError('uncreated', matchCause.CREATE)

    let lobby = new Lobby(controller, ID)
    this._lobbyList.set(ID, lobby)

    return lobby
  }

  public static get(id: string): Lobby | undefined {
    return this._lobbyList.get(id)
  }

  public static drop(entity: string | Lobby): boolean {
    if (typeof entity == 'string') return this._lobbyList.delete(entity)
    return this._lobbyList.delete(entity.id)
  }

  private static createID() {
    return uuid()
  }
}

class Lobby implements MatchLobby {
  public members = new MemberList()

  constructor(
    private _matchController: MatchController,
    private _id: string,
    ...members: Array<Member>
  ) {
    if (members) {
      _matchController.addMembers(...members).then((status) => {
        if (!status) throw new MatchError(_id, matchCause.ADD_MEMBER)
        this.members.add(...members)
      })
    }
  }

  public get id() {
    return this._id
  }

  public get status() {
    if (this.members.quantityOfPlayers < 10) return 'searching'
    else return this._matchController.status
  }

  public async start() {
    return this._matchController.start()
  }

  public async stop() {
    return this._matchController.stop()
  }

  public async addMember(member: Member) {
    let status = await this._matchController.addMembers(member)
    if (!status) return false

    return this.members.add(member)
  }

  public async removeMember(member: Member) {
    let status = await this._matchController.removeMembers(member)
    if (!status) return false

    return this.members.delete(member)
  }

  /**
   *
   * @param объект, в котором обязательно должно быть поле name, а также опциональные поля readyFlag, command
   * @returns
   */
  public async updateMember(member: {
    name: string
    command?: unknown
    readyFlag?: unknown
  }) {
    if (!member.name) return false
    if (!MemberList.isMember(member)) {
      if (MemberList.isCommand(member.command)) {
        if (!this._matchController.changeCommand(member.name, member.command))
          return false
        if (!this.members.changeCommand(member.name, member.command))
          return false
      }

      if (member.readyFlag && typeof member.readyFlag == 'boolean') {
        if (!this._matchController.changeStatus(member.name, member.readyFlag))
          return false
        if (!this.members.changeStatus(member.name, member.readyFlag))
          return false
      }
      return true
    }

    if (!this._matchController.updateMember(member)) return false
    let tmp = this.members.getMember(member)
    if (tmp == this.members.currentUndefined) return false

    tmp.command = member.command
    tmp.readyFlag = member.readyFlag

    return true
  }

  public async changeCommand(
    member: string | Member,
    command: command,
  ): Promise<boolean> {
    if (!(await this._matchController.changeCommand(member, command)))
      return false

    return this.members.changeCommand(member, command)
  }

  public async changeStatus(
    member: string | Member,
    readyFlag: boolean,
  ): Promise<boolean> {
    if (!(await this._matchController.changeStatus(member, readyFlag)))
      return false
    return this.members.changeStatus(member, readyFlag)
  }
}