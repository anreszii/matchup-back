import { command, IMember } from '../Lobby'
import { MatchController, matchStatus } from './MatchController'

export class StandOffController implements MatchController {
  private _status: Exclude<matchStatus, 'searching'> = 'filled'
  constructor() {
    //connection
  }

  get status(): 'filled' | 'started' {
    return 'filled'
  }

  public async create(): Promise<boolean> {
    return true
  }

  public async start(): Promise<boolean> {
    return true
  }

  public async stop(): Promise<boolean> {
    return true
  }

  public async addMembers(...members: IMember[]): Promise<boolean> {
    return true
  }

  public async removeMembers(...members: IMember[]): Promise<boolean> {
    return true
  }

  public async updateMember(member: IMember): Promise<boolean> {
    return true
  }

  public async changeCommand(
    member: string | IMember,
    command: command,
  ): Promise<boolean> {
    return true
  }

  public async changeStatus(
    member: string | IMember,
    readyFlag: boolean,
  ): Promise<boolean> {
    return true
  }

  public get gameName(): 'StandOff2' {
    return 'StandOff2'
  }
}
