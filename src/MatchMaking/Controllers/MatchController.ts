import type { command, Member } from '../Lobby'
export declare type matchStatus = 'searching' | 'filled' | 'started'

export declare interface MatchController {
  get status(): Exclude<matchStatus, 'searching'>

  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(...members: Array<Member>): Promise<boolean>
  removeMembers(...members: Array<Member>): Promise<boolean>
  updateMember(member: Member): Promise<boolean>
  changeCommand(member: string | Member, command: command): Promise<boolean>
  changeStatus(member: string | Member, readyFlag: boolean): Promise<boolean>
}
