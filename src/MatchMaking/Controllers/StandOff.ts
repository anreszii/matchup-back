import { command, Member } from '../Lobby'
import { MatchController, matchStatus } from './MatchController'

export class StandOffController implements MatchController {
  private _status: Exclude<matchStatus, 'searching'> = 'filled'
  constructor() {
    //connection
  }

  get status() {
    return this._status
  }

  async create(): Promise<boolean> {
    return true
  }

  async start(): Promise<boolean> {
    return true
  }

  async stop(): Promise<boolean> {
    return true
  }

  async addMembers(...members: Member[]): Promise<boolean> {
    return true
  }

  async removeMembers(...members: Member[]): Promise<boolean> {
    return true
  }

  async changeCommand(
    member: string | Member,
    command: command,
  ): Promise<boolean> {
    return true
  }
}
