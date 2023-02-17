import { Match } from '.'
import { StateMachine } from '..'
import { IEntity } from '../Manager'
export interface IMatchPlayer
  extends IEntity<string>,
    StateMachine<PlayerStates> {
  state: PlayerStates
  data: PlayerData

  update(): Promise<boolean>

  notify(content): void
  isPremium(): Promise<boolean>
}

export interface PlayerData extends Object {
  id: string
  name: string
  nick: string
  GRI: number
  discordNick: string
  commandID?: number
  teamID?: number
  lobbyID?: string
  guild?: string
  prefix?: string
}

export enum PlayerStates {
  deleted,
  corrupted,
  offline,
  idle,
  online,
  searching,
  ready,
  playing,
}
