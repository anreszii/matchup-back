import type { Match } from '../Interfaces'

export const enum lobbyStatus {
  STARTED = 'started',
  WAITING = 'waiting for players',
  FULL = 'fullfilled',
}

export const UNDEFINED_MEMBER: Match.Member.Instance = {
  id: 'undefined',
  name: 'undefined',
  flags: {
    ready: false,
    searching: false,
  },
  GRI: 0,
} as Match.Member.Instance

export const MAX_TEAM_MEMBER = 5
