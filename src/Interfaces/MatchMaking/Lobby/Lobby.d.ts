import type { Match } from '../index'
import type { IEntity, IChat, Rating } from '../../index'
//TODO разделить на лобби + игра
export declare interface ILobby extends IEntity<string> {
  join(name: string): Promise<boolean>
  leave(name: string): Promise<boolean>
  updateStatus(): Promise<void>
  vote(name: string, map: string): boolean
  move(
    name: string,
    command: Command.Instance | Command.Types | number,
  ): Promise<boolean>
  start(): Promise<boolean>
  markToDelete(): boolean

  canAddTeam(id: number): boolean
  setGameId(name: string, id: string): boolean
  hasSpace(memberCount: number): boolean

  get id(): string
  get state(): Match.Lobby.State
  get game(): Match.Manager.supportedGames
  get type(): Match.Lobby.Type

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

  get players(): Match.Player.Instance[]
  get players(): Match.Player.Instance[]

  get playersCount(): number
  get membersCount(): number

  get commands(): Map<Command.Types, Command.Instance>

  set counter(value: Counter)
  get isReady(): Promise<boolean>

  get maps(): string[]
  get votingCaptain(): string
  get isVotingStageEnd(): boolean
  get map(): string | undefined
  get readyToStart(): boolean
  get startedAt(): Date | undefined

  get owner(): string | undefined
  get gameID(): string | undefined
}
