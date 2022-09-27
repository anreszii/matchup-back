import type { Match } from '../index'
export type IMatchMember = {
  name: string
  command: Match.Member.command
  readyFlag: boolean
  GRI: number
  teamID?: number
}
