import type { Match } from '../index'
import type { IEntity, Chat, Rating } from '../../index'
import type { MemberList } from '../../../Classes/index'
export declare interface ILobby extends IEntity<string> {
  get id(): string
  get status(): Match.Lobby.status | undefined
  get game(): Match.Manager.supportedGames
  get members(): MemberList

  get chat(): Chat.Instance | undefined
  set chat(instance: Chat.Instance | undefined)

  get region(): Rating.SearchEngine.SUPPORTED_REGIONS
  set region(region: Rating.SearchEngine.SUPPORTED_REGIONS)

  get GRI(): number

  start(): Promise<boolean>
  stop(): Promise<boolean>

  hasSpace(
    memberCount: number,
  ): Exclude<Match.Member.command, 'spectator' | 'neutral'> | false

  addMember(member: Match.Member.Instance): Promise<boolean>
  removeMember(member: Match.Member.Instance): Promise<boolean>
  updateMember(
    member: Required<Pick<Match.Member.Instance, 'name'>> & {
      [Key in Exclude<keyof Match.Member.Instance, 'name'>]?:
        | Match.Member.Instance[Key]
        | string
    },
  ): Promise<boolean>
}
