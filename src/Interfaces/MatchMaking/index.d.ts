import { IMatchMember } from './Member'
import { ILobby } from './Lobby'
import { MatchController } from './Controller'
import { IManager, Chat } from '../'

export declare namespace Match {
  namespace Manager {
    interface Interface extends IManager<Match.Lobby.Interface, string> {}
    type supportedGames = 'StandOff2'
  }
  namespace Lobby {
    interface Interface extends ILobby {}
    type status = 'searching' | 'filled' | 'started'
  }
  namespace Member {
    interface Interface extends IMatchMember {}
    type command = 'spectator' | 'neutral' | 'command1' | 'command2'
  }
  interface Controller extends MatchController {}
}
