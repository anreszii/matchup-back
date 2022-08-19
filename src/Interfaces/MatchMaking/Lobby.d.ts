import type { Match } from './'
import type { IEntity } from '../'
export declare interface ILobby extends IEntity<string> {
  get id(): string
  get status(): Match.Lobby.status | undefined
  get game(): Match.Manager.supportedGames

  start(): Promise<boolean>
  stop(): Promise<boolean>

  addMember(member: Match.Member.Interface): Promise<boolean>
  removeMember(member: Match.Member.Interface): Promise<boolean>
  updateMember(
    member: Required<Pick<Match.Member.Interface, 'name'>> &
      Partial<Omit<Match.Member.Interface, 'name'>>,
  ): Promise<boolean>
}
