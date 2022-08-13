import { SUPPORTED_GAMES } from '../..'
import type { command, IMember } from '../Lobby'
export declare type matchStatus = 'searching' | 'filled' | 'started'

export declare interface MatchController {
  get status(): Exclude<matchStatus, 'searching'>

  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(...members: Array<IMember>): Promise<boolean>
  removeMembers(...members: Array<IMember>): Promise<boolean>
  updateMember(member: IMember): Promise<boolean>
  changeCommand(member: string | IMember, command: command): Promise<boolean>
  changeStatus(member: string | IMember, readyFlag: boolean): Promise<boolean>

  get gameName(): SUPPORTED_GAMES
}
