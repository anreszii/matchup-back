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
      get counter(): Lobby.Counter
    }
    type supportedGames = 'StandOff2'
  }
  namespace Lobby {
    interface Instance extends ILobby {
      get readyToStart(): boolean
      vote(name: string, map: string): boolean
      get maps(): string[]
      get votingCaptain(): string
      get isVotingStageEnd(): boolean
      get map(): string | undefined
      move(
        name: string,
        command: Command.Instance | Command.Types | number,
      ): Promise<boolean>
      becomeReady(name: string): boolean
      get commands(): Map<Command.Types, Command.Instance>
      set discord(client: DiscordClient)
      get discord(): DiscordClient

      set counter(value: Counter)
      get isReady(): boolean
    }

    type Counter = {
      searching: number
      playing: number
    }

    type Type = 'training' | 'arcade' | 'rating'

    type Status = 'searching' | 'filled' | 'voting' | 'preparing' | 'started'

    namespace Command {
      type Types = 'spectators' | 'neutrals' | 'command1' | 'command2'
      interface Manager extends IManager<Command.Instance, number> {
        findByUserName(username: string): Promise<Command.Instance | undefined>
        findById(id: number): Command.Instance | undefined
        move(
          name: string,
          from: Instance | number,
          to: Instance | number,
        ): Promise<boolean>
        get toArray(): Command.Instance[]
        get IDs(): number[]
      }
      interface Instance extends Group<number> {
        isCaptain(member: string | Member.Instance): boolean
        move(name: string, command: Instance | Types | number): Promise<boolean>
        has(name: string): boolean
        get(name: string): Member.Instance | null

        get lobbyID(): string
        get type(): Types

        get isForTeam(): boolean
        get isOneTeam(): boolean
        get maxTeamSizeToJoin(): number

        get players(): Member.Instance[]

        get playersCount(): number
        get teamPlayersCount(): number
        get soloPlayersCount(): number
        get isFilled(): boolean

        set captain(value: string)
        get captain(): string

        becomeReady(name: string): boolean
        get isReady(): boolean
      }
    }
  }

  namespace Member {
    interface Manager extends IManager<Member.Instance, string> {
      becomeReady(name: string): boolean
      becomeUnready(name: string): boolean
    }
    interface Instance extends IMatchMember {
      notify(content: string): Promise<boolean>
    }

    interface InstanceData extends Omit<Instance, 'readyToDrop' | 'delete'> {}

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

    interface List extends OneTypeArray<Member.Instance> {
      isMember(entity: unknown): entity is Member.Instance

      hasMember(name: string): boolean

      addMember(member: Member.Instance): boolean

      deleteMember(name: string): boolean

      getByName(name: string): Member.Instance | null

      get count(): number

      get members(): Member.Instance[]
      get membersCount(): number
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
