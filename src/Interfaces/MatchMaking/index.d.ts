import { IMatchMember } from './Member.js'
import { ILobby } from './Lobby.js'
import { MatchController } from './Controller.js'
import { IManager } from '../index.js'

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
