import { IMember, MATCH_STATUS, SUPPORTED_GAMES, COMMAND } from './'
export declare interface MatchController {
  get status(): Exclude<MATCH_STATUS, 'searching'>

  create(): Promise<boolean>
  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMembers(...members: Array<IMember>): Promise<boolean>
  removeMembers(...members: Array<IMember>): Promise<boolean>
  updateMember(member: IMember): Promise<boolean>

  get gameName(): SUPPORTED_GAMES
}
