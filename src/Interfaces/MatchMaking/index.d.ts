import type { IManager } from '../'
import type { Group } from './Group'

import type { ILobby } from './Lobby/Lobby'
import type { MatchController } from './Controller'

import type { IMatchMember } from './Member'
import type { IStatistic } from './Statistic'

import type { OneTypeArray } from '../../Classes/OneTypeArray'
import type { DiscordClient } from '../../Classes/Discord/Client'

export declare namespace Match {
  namespace Manager {
    interface Instance extends IManager<Match.Lobby.Instance, string> {
      get lobbies(): Array<Match.Lobby.Instance>
    }
    type supportedGames = 'StandOff2'
  }
  namespace Lobby {
    interface Instance extends ILobby {
      set discord(client: DiscordClient)
      get discord(): DiscordClient
    }

    type Status = 'searching' | 'filled' | 'started'

    namespace Command {
      type Types = 'spectators' | 'neutrals' | 'command1' | 'command2'
      interface Manager extends IManager<Command.Instance, number> {
        findByUserName(username: string): Promise<Command.Instance | undefined>
        findById(id: number): Command.Instance | undefined
        move(name: string, from: number, to: number): Promise<boolean>
        get toArray(): Command.Instance[]
        get IDs(): number[]
      }
      interface Instance extends Group<number> {
        isCaptain(member: string | Member.Instance): boolean

        get lobbyID(): string
        get type(): Types

        get isForTeam(): boolean
        get maxTeamSizeToJoin(): number

        get playersCount(): number
        get teamPlayersCount(): number
        get soloPlayersCount(): number

        set captain(value: string)
        get captain(): string
      }
    }
  }

  namespace Member {
    interface Manager extends IManager<Member.Instance, string> {}
    interface Instance extends IMatchMember {}

    namespace Team {
      interface Manager extends IManager<Team.Instance, number> {
        findByUserName(username: string): Promise<Team.Instance | undefined>
        findById(id: number): Team.Instance | undefined
        get toArray(): Team.Instance[]
        get IDs(): number[]
      }
      interface Instance extends Group<number> {
        isCaptain(member: string | Member.Instance): boolean
        set captainName(value: string)
        get captainName(): string
      }
    }

    interface List extends OneTypeArray<Instance> {
      isMember(entity: unknown): entity is Instance

      hasMember(name: string): boolean

      addMember(member: Instance): boolean

      deleteMember(name: string): boolean

      getByName(name: string): Member.Instance | null

      get count(): number

      get isGuild(): boolean

      get playersCount(): number
      get spectatorsCount(): number

      get players(): Member.Instance[]
      get spectators(): Member.Instance[]
    }
    interface Statistic extends IStatistic {}
  }

  interface Controller extends MatchController {}

  const enum Result {
    LOSE = 0,
    DRAW = 0.5,
    WIN = 1,
  }
}

export * from './Rating'
