import type { Match } from './index.js'
export declare interface MatchController {
  get status(): Exclude<Match.Lobby.status, 'searching'>

  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(...members: Array<Match.Member.Interface>): Promise<boolean>
  removeMembers(...members: Array<Match.Member.Interface>): Promise<boolean>
  updateMember(member: Match.Member.Interface): Promise<boolean>

  get gameName(): Match.Manager.supportedGames
}
