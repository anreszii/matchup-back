import { matchCause, MatchError } from '../../error'
import { MemberList } from './MemberList'

import { v4 as uuid } from 'uuid'
import type {
  IManager,
  MatchController,
  ILobby,
  SUPPORTED_GAMES,
  IMember,
  COMMAND,
} from '../../Interfaces'

export class LobbyManager implements IManager<ILobby, string> {
  private _lobbyMap: Map<string, Lobby> = new Map()
  private _controller: MatchController
  constructor(controller: MatchController) {
    this._controller = controller
  }

  public spawn(): Lobby {
    const ID = LobbyManager._createID()
    this._controller.create().then((status) => {
      if (!status) throw new MatchError('lobby', matchCause.CREATE)
    })

    let lobby = new Lobby(this._controller, ID)
    this._lobbyMap.set(ID, lobby)

    return lobby
  }

  public getFreeLobby(lobbyID?: string): Lobby {
    if (lobbyID && this._lobbyMap.has(lobbyID))
      return this._lobbyMap.get(lobbyID)!

    let notFilledLobby = this._findFreeLobby()

    if (notFilledLobby) return notFilledLobby
    return this.spawn()
  }

  public get(lobbyID: string) {
    return this._lobbyMap.get(lobbyID)
  }

  public has(lobbyID: string) {
    return this._lobbyMap.has(lobbyID)
  }

  public drop(lobbyID: string | Lobby): boolean {
    if (typeof lobbyID == 'string') return this._lobbyMap.delete(lobbyID)
    return this._lobbyMap.delete(lobbyID.id)
  }

  private _findFreeLobby() {
    for (let lobby of this._lobbyMap.values()) {
      if (
        lobby.status == 'searching' &&
        lobby.game == this._controller.gameName
      )
        return lobby
      if (!lobby.status) this.drop(lobby)
    }
  }

  private static _createID() {
    return uuid()
  }
}

class Lobby implements ILobby {
  public members = new MemberList()
  private _game: SUPPORTED_GAMES

  constructor(
    private _matchController: MatchController,
    private _id: string,
    ...members: Array<IMember>
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
    if (this.members.quantityOfMembers == 0) return undefined
    if (this.members.quantityOfPlayers < 10) return 'searching'
    else return this._matchController.status
  }

  public async start() {
    return this._matchController.start()
  }

  public async stop() {
    return this._matchController.stop()
  }

  public async addMember(member: IMember) {
    let status = await this._matchController.addMembers(member)
    if (!status) return false

    return this.members.add(member)
  }

  public async removeMember(member: IMember) {
    let status = await this._matchController.removeMembers(member)
    if (!status) return false

    status = this.members.delete(member)

    return status
  }

  /**
   *
   * @param объект, в котором обязательно должно быть поле name, а также опциональные поля readyFlag, command
   * @returns
   */
  public async updateMember(member: {
    name: string
    command?: COMMAND
    readyFlag?: boolean
  }) {
    let tmp = this.members.getMember(member.name)
    if (tmp == this.members.currentUndefined) return false

    if (!member.name) return false
    if (!MemberList.isMember(member)) {
      let { readyFlag, command } = member

      if (!readyFlag) member.readyFlag = tmp.readyFlag
      if (!command) member.command = tmp.command

      if (!this._matchController.updateMember(member as unknown as IMember))
        return false

      tmp.command = member.command!
      tmp.readyFlag = member.readyFlag!

      return true
    }

    if (!this._matchController.updateMember(member)) return false
    if (tmp == this.members.currentUndefined) return false

    tmp.command = member.command
    tmp.readyFlag = member.readyFlag

    return true
  }
}
