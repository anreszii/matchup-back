import { Match } from '.'
import { DTO, StateMachine } from '..'
import { IEntity } from '../Manager'
export type Name = string
export type ID = string
export interface IMatchPlayer
  extends IEntity<ID>,
    StateMachine<PlayerSignals, PlayerStates> {
  get state(): PlayerStates
  get PublicData(): PlayerData

  update(): Promise<boolean>
  send(event: string, content: DTO.Object): void

  notify(content): void
  isPremium(): Promise<boolean>
}

export interface PlayerData extends Object {
  id: ID
  name: Name
  nick: Name
  GRI: number
  discordNick: string
  lobbyID?: Match.Lobby.ID
  commandID?: Match.Lobby.Command.Types
  teamID?: Match.Player.Team.ID
  guild?: string
  prefix?: string
  flags: {
    searching: boolean
    ready: boolean
  }
}

export type PrivatePlayerData = {
  uid: Match.Player.ID
  state: PlayerStates
  fetchedFromDB: Match.Player.Data
}

export const enum PlayerSignals {
  be_idle = 'idle',
  init = 'init',
  be_online = 'online',
  search = 'search',
  join_lobby = 'join lobby',
  leave_lobby = 'leave lobby',
  be_ready = 'ready',
  be_unready = 'unready',
  vote = 'voting',
  prepare = 'preparing',
  play = 'starting',
  corrupt = 'corrupted',
  delete = 'deleted',
}

export const enum PlayerStates {
  deleted,
  init,
  idle,
  online,
  searching,
  waiting,
  ready,
  voting,
  preparing,
  playing,
}
