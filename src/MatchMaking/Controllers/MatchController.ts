import type { Member } from '../Lobby'

export declare interface MatchController {
  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(...members: Array<Member>): Promise<boolean>
  removeMembers(...members: Array<Member>): Promise<boolean>
}
