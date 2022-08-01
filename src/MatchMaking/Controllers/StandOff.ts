import { Member } from '../Lobby'
import { MatchController } from './MatchController'

export class StandOffController implements MatchController {
  constructor() {
    //connection
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
}
