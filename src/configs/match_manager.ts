import type { Match } from '../Interfaces'

export const enum lobbyStatus {
  STARTED = 'started',
  WAITING = 'waiting for players',
  FULL = 'fullfilled',
}

export const UNDEFINED_MEMBER: Match.Member.Instance = {
  id: 'undefined',
  name: 'undefined',
  readyFlag: false,
  GRI: 0,
}

export const MAX_TEAM_MEMBER = 5
