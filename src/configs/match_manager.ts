import type { Match } from '../Interfaces/index.js'

export const enum lobbyStatus {
  STARTED = 'started',
  WAITING = 'waiting for players',
  FULL = 'fullfilled',
}

export const UNDEFINED_MEMBER: Match.Member.Interface = {
  name: 'undefined',
  command: 'neutral',
  readyFlag: false,
  statistic: {
    kills: 0,
    deaths: 0,
    assists: 0,
  },
}

export const MAX_TEAM_MEMBER = 5
