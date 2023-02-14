import type { Match } from './'
export declare interface MatchController {
  get status(): Exclude<Match.Lobby.State, 'searching'>

  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(
    ...members: Array<Match.Player.Instance | string>
  ): Promise<boolean>
  removeMembers(
    ...members: Array<Match.Player.Instance | string>
  ): Promise<boolean>
  updateMember(member: Partial<Match.Player.Instance>): Promise<boolean>

  get gameName(): Match.Manager.supportedGames
}
