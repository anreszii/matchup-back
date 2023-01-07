import type { Match } from '../index'
import type { IEntity, IChat, Rating } from '../../index'
export declare interface ILobby extends IEntity<string> {
  join(name: string): Promise<boolean>
  leave(name: string): Promise<boolean>

  get id(): string
  get status(): Match.Lobby.Status
  get game(): Match.Manager.supportedGames
  get type(): Match.Lobby.Type
  get members(): Match.Member.List

  get chat(): IChat.Controller
  set chat(instance: IChat.Controller)

  get region(): Rating.SearchEngine.SUPPORTED_REGIONS
  set region(region: Rating.SearchEngine.SUPPORTED_REGIONS)

  get GRI(): number
  get isForGuild(): boolean

  get firstCommand(): Match.Lobby.Command.Instance
  get secondCommand(): Match.Lobby.Command.Instance
  get neutrals(): Match.Lobby.Command.Instance
  get spectators(): Match.Lobby.Command.Instance

  get players(): Match.Member.InstanceData[]
  get playersCount(): number

  start(): Promise<boolean>
  markToDelete(): Promise<boolean>

  canAddTeam(id: number): boolean

  hasSpace(memberCount: number): boolean
}
