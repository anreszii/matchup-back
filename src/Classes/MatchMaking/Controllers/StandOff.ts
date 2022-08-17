import {
  IMember,
  MATCH_STATUS,
  MatchController,
} from '../../../Interfaces/MatchMaking'

export class StandOffController implements MatchController {
  private _status: Exclude<MATCH_STATUS, 'searching'> = 'filled'
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

  public get gameName(): 'StandOff2' {
    return 'StandOff2'
  }
}
