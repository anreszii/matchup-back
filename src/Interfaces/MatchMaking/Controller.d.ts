import type { Match } from './'
export declare interface MatchController {
  get status(): Exclude<Match.Lobby.status, 'searching'>

  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(...members: Array<Match.Member.Instance>): Promise<boolean>
  removeMembers(...members: Array<Match.Member.Instance>): Promise<boolean>
  updateMember(member: Match.Member.Instance): Promise<boolean>

  get gameName(): Match.Manager.supportedGames
}
