import { IEntity, MATCH_STATUS, IMember } from '../'
export declare interface ILobby extends IEntity<string> {
  get id(): string
  get status(): MATCH_STATUS | undefined
  start(): Promise<boolean>
  stop(): Promise<boolean>
  addMember(member: IMember): Promise<boolean>
  removeMember(member: IMember): Promise<boolean>
  updateMember(
    member: Required<Pick<IMember, 'name'>> & Partial<Omit<IMember, 'name'>>,
  ): Promise<boolean>
}
