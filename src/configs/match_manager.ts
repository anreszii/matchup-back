import type { IMember } from '../Classes/MatchMaking/Lobby'

export const enum lobbyStatus {
  STARTED = 'started',
  WAITING = 'waiting for players',
  FULL = 'fullfilled',
}

export const UNDEFINED_MEMBER: IMember = {
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
