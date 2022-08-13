import { command, IMember } from '../Lobby'
import { MatchController, matchStatus } from './MatchController'

export class StandOffController implements MatchController {
  private _status: Exclude<matchStatus, 'searching'> = 'filled'
  constructor() {
    //connection
  }
}
