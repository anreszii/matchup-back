import { matchCause, MatchError } from '../error'
import { MemberList } from './MemberListl'

import { v4 as uuid } from 'uuid'
import type { MatchController } from './Controllers/MatchController'

export type command = 'spectator' | 'neutral' | 'command1' | 'command2'

export type Member = {
  name: string
  command: command
  readyFlag: boolean
}

export interface MatchLobby {
  start(): Promise<boolean>
  stop(): Promise<boolean>
}

export class LobbyManager {
  private static _lobbyList: Map<string, Lobby> = new Map()

  public static spawn(
    controller: MatchController,
    ...members: Array<Member>
  ): Lobby {
    const ID = this.createID()

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
        if (!status) throw new MatchError(_id, matchCause.ADD_MEMBERS)
        this.members.add(...members)
      })
    }
  }

  public get id() {
    return this._id
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
