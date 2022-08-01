import type { Member } from '../MatchMaking/Lobby'

export const enum lobbyStatus {
  STARTED = 'started',
  WAITING = 'waiting for players',
  FULL = 'fullfilled',
}

export const UNDEFINED_MEMBER: Member = {
  name: 'undefined',
  command: 'neutral',
  readyFlag: false,
}

export const MAX_TEAM_MEMBER = 5
