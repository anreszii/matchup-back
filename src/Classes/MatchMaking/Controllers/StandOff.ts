import type { Match } from '../../../Interfaces'

export class StandOffController implements Match.Controller {
  private _status: Exclude<Match.Lobby.State, 'searching'> = 'filled'
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

  public async addMembers(
    ...members: Match.Member.Instance[]
  ): Promise<boolean> {
    return true
  }

  public async removeMembers(
    ...members: Match.Member.Instance[]
  ): Promise<boolean> {
    return true
  }

  public async updateMember(member: Match.Member.Instance): Promise<boolean> {
    return true
  }

  public get gameName(): 'StandOff2' {
    return 'StandOff2'
  }
}
