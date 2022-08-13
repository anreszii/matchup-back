import { matchCause, MatchError } from '../error'
import { MemberList } from './MemberList'

import { v4 as uuid } from 'uuid'
import type {
  MatchController,
  matchStatus,
} from './Controllers/MatchController'
import { SUPPORTED_GAMES } from '..'

export type command = 'spectator' | 'neutral' | 'command1' | 'command2'

export type Member = {
  name: string
  command: command
  readyFlag: boolean
  statistic: {
    kills: number
    deaths: number
    assists: number
  }
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
  changeMemberStatus(
    member: Member | string,
    readyFlag: boolean,
  ): Promise<boolean>
}

export class LobbyManager {
  private static _lobbyList: Map<string, Lobby> = new Map()
  private _controller: MatchController
  constructor(controller: MatchController) {
    this._controller = controller
  }

  public spawn(): Lobby {
    const ID = LobbyManager.createID()
    this._controller.create().then((status) => {
      if (!status) throw new MatchError('lobby', matchCause.CREATE)
    })

    let lobby = new Lobby(this._controller, ID)
    LobbyManager._lobbyList.set(ID, lobby)

    return lobby
  }

  public getFreeLobby(lobbyID?: string): Lobby {
    if (lobbyID && LobbyManager._lobbyList.has(lobbyID))
      return LobbyManager._lobbyList.get(lobbyID)!

    let notFilledLobby = this._findFreeLobby()

    if (notFilledLobby) return notFilledLobby
    return this.spawn()
  }

  public static get(lobbyID: string) {
    return this._lobbyList.get(lobbyID)
  }

  public static drop(entity: string | Lobby): boolean {
    if (typeof entity == 'string') return this._lobbyList.delete(entity)
    return this._lobbyList.delete(entity.id)
  }

  private _findFreeLobby() {
    for (let lobby of LobbyManager._lobbyList.values()) {
      if (
        lobby.status == 'searching' &&
        lobby.game == this._controller.gameName
      )
        return lobby
    }
  }

  private static createID() {
    return uuid()
  }
}

class Lobby implements MatchLobby {
  public members = new MemberList()
  private _game: SUPPORTED_GAMES

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
    this._game = _matchController.gameName
  }

  public get game() {
    return this._game
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

    status = !this.members.delete(member)

    if (this.members.quantityOfSpectators + this.members.quantityOfPlayers == 0)
      LobbyManager.drop(this)
    return status
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

  public async changeMemberStatus(
    member: string | Member,
    readyFlag: boolean,
  ): Promise<boolean> {
    if (!(await this._matchController.changeStatus(member, readyFlag)))
      return false
    return this.members.changeStatus(member, readyFlag)
  }
}
