import { matchCause, MatchError } from '../error'
import { MemberList } from './MemberListl'

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
  _command1: number = 0
  _command2: number = 0

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
}
