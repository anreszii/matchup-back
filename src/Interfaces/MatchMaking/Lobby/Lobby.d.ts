import type { Match } from '../index'
import type { IEntity, Chat, Rating } from '../../index'
export declare interface ILobby extends IEntity<string> {
  join(name: string): Promise<boolean>
  leave(name: string): Promise<boolean>

  get id(): string
  get status(): Match.Lobby.Status | undefined
  get game(): Match.Manager.supportedGames
  get members(): Match.Member.List

  get chat(): Chat.Instance
  set chat(instance: Chat.Instance)

  get region(): Rating.SearchEngine.SUPPORTED_REGIONS
  set region(region: Rating.SearchEngine.SUPPORTED_REGIONS)

  get GRI(): number
  get isForGuild(): boolean

  get firstCommand(): Match.Lobby.Command.Instance

  get secondCommand(): Match.Lobby.Command.Instance

  get neutrals(): Match.Lobby.Command.Instance

  get spectators(): Match.Lobby.Command.Instance

  start(): Promise<boolean>
  stop(): Promise<boolean>

  canAddTeam(id: number): boolean

  hasSpace(memberCount: number): boolean
}
