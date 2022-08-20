import type { Match } from './index.js'
export type IMatchMember = {
  name: string
  command: Match.Member.command
  readyFlag: boolean
  statistic: {
    kills: number
    deaths: number
    assists: number
  }
}
