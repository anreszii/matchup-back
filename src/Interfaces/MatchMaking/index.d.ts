import type { IManager } from '../'
import type { Group } from './Group'

import type { ILobby } from './Lobby/Lobby'
import type { MatchController } from './Controller'

import type { IMatchPlayer, Name, PlayerData } from './Player'
import type { IStatistic } from './Statistic'

import type { OneTypeArray } from '../../Classes/OneTypeArray'

export declare namespace Match {
  namespace Manager {
    interface Instance extends IManager<Match.Lobby.Instance, string> {
      get lobbies(): Array<Match.Lobby.Instance>
      get counter(): Lobby.Counter
    }
    type supportedGames = 'StandOff2'
  }
  namespace Lobby {
    type ID = string
    const enum States {
      deleted = 0,
      searching = 1,
      filled = 2,
      voting = 3,
      preparing = 4,
      started = 5,
    }
    interface Instance extends ILobby {}

    type Counter = {
      searching: number
      playing: number
    }

    type Type = 'training' | 'arcade' | 'rating'

    namespace Command {
      type ID = string
      type Types = 'spectators' | 'neutrals' | 'command1' | 'command2'
      interface Manager extends IManager<Command.Instance, ID> {
        findByUserName(username: string): Command.Instance | undefined
        findById(id: ID): Command.Instance | undefined
        move(name: string, to: IDr): boolean
        get toArray(): Command.Instance[]
        get IDs(): ID[]
      }
      interface Instance extends Group<ID> {
        isCaptain(member: string | Player.Instance): boolean
        has(entity: Match.Player.Instance | string): boolean
        get(name: string): Player.Instance | undefined

        get lobbyID(): string
        get type(): Types

        get isForTeam(): boolean
        get isOneTeam(): boolean
        get maxTeamSizeToJoin(): number

        get players(): Map<Name, Player.Instance>

        get playersCount(): number
        get teamPlayersCount(): number
        get soloPlayersCount(): number
        get isFilled(): boolean

        set captain(value: string)
        get captain(): string

        get isReady(): boolean
      }
    }
  }

  namespace Player {
    type ID = string
    type Name = string
    interface Manager extends IManager<Player.Instance, string> {
      isOnline(names: string[]): Map<string, boolean>
    }
    interface Instance extends IMatchPlayer {}

    interface Data extends PlayerData {}

    namespace Team {
      type ID = string

      interface Manager extends IManager<Team.Instance, ID> {
        findByUserName(username: string): Team.Instance | undefined
        findById(id: ID): Team.Instance | undefined
        get toArray(): Team.Instance[]
        get IDs(): ID[]
      }
      interface Instance extends Group<ID> {
        isCaptain(member: string | Player.Instance): boolean
        set captainName(value: string)
        get captainName(): string

        get maximumRatingSpread(): number
      }
    }

    interface List extends OneTypeArray<Player.Instance> {
      isMember(entity: unknown): entity is Player.Instance

      hasMember(name: string): boolean

      addMember(member: Player.Instance): boolean

      deleteMember(name: string): boolean

      getByName(name: string): Player.Instance | null

      get count(): number

      get members(): Player.Instance[]
      get membersCount(): number
    }
    interface Statistic extends IStatistic {}
  }

  const enum Result {
    LOSE = 0,
    DRAW = 0.5,
    WIN = 1,
  }
}

export * from './Rating'
