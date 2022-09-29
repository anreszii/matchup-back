import type { ILobby, IMatchMember } from './Lobby'
import type { MatchController } from './Controller'
import type { IManager } from '../'
import type { IStatistic } from './Statistic'
import type { TeamsManager, ITeam } from './Team'
import { DiscordClient } from '../../Classes/Discord/Client'

export declare namespace Match {
  namespace Manager {
    interface Instance extends IManager<Match.Lobby.Instance, string> {
      get lobbies(): Array<Match.Lobby.Instance>
    }
    type supportedGames = 'StandOff2'
  }
  namespace Lobby {
    interface Instance extends ILobby {
      set dsClient(client: DiscordClient | undefined)
      get dsClient(): DiscordClient | undefined
    }
    type status = 'searching' | 'filled' | 'started'
  }
  namespace Member {
    interface Instance extends IMatchMember {}
    type command = 'spectator' | 'neutral' | 'command1' | 'command2'
    interface Statistic extends IStatistic {}
  }

  namespace Team {
    interface Manager extends TeamsManager {
      findByUserName(username: string): Instance | undefined
    }
    interface Instance extends ITeam {
      get GRI(): number
      get membersCount(): number
    }
  }

  interface Controller extends MatchController {}

  const enum Result {
    LOSE = 0,
    DRAW = 0.5,
    WIN = 1,
  }
}

export * from './Rating'
