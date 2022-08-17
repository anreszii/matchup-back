import { COMMAND } from './'
export type IMember = {
  name: string
  command: COMMAND
  readyFlag: boolean
  statistic: {
    kills: number
    deaths: number
    assists: number
  }
}
