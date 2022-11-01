import type { Match } from './'
export declare interface MatchController {
  get status(): Exclude<Match.Lobby.Status, 'searching'>

  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(
    ...members: Array<Match.Member.Instance | string>
  ): Promise<boolean>
  removeMembers(
    ...members: Array<Match.Member.Instance | string>
  ): Promise<boolean>
  updateMember(member: Partial<Match.Member.Instance>): Promise<boolean>

  get gameName(): Match.Manager.supportedGames
}
