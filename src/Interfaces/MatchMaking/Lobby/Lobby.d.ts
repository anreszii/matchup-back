import type { Match } from '../index'
import type { IEntity, IChat, Rating } from '../../index'
import { Lobby } from '../../../Classes/MatchMaking/Lobby/Lobby'
//TODO разделить на лобби + игра
export declare interface ILobby extends IEntity<string> {
  join(name: string): boolean
  leave(name: string): boolean
  updateState(): void
  vote(name: string, map: string): boolean
  move(name: string, command: Command.Types): boolean
  start(): boolean
  markToDelete(): boolean

  canAddTeam(id: Match.Player.Team.ID): boolean
  setGameId(name: string, id: string): boolean
  hasSpace(memberCount: number): boolean

  get id(): string
  get state(): Match.Lobby.States
  get type(): Match.Lobby.Type

  get chat(): IChat.Controller

  get region(): Rating.SearchEngine.SUPPORTED_REGIONS
  set region(region: Rating.SearchEngine.SUPPORTED_REGIONS)

  get GRI(): number
  get isForGuild(): boolean

  get firstCommand(): Match.Lobby.Command.Instance
  get secondCommand(): Match.Lobby.Command.Instance
  get neutrals(): Match.Lobby.Command.Instance
  get spectators(): Match.Lobby.Command.Instance

  get players(): Map<string, Match.Player.Instance>
  get members(): Map<string, Match.Player.Instance>
  get playersData(): Match.Player.Data[]
  get membersData(): Match.Player.Data[]

  get playersCount(): number
  get membersCount(): number

  get commands(): Map<Command.Types, Command.Instance>

  set counter(value: Counter)
  set typeCounters(value: Match.Lobby.AvailableLobbyTypesCounter)
  get isReady(): boolean

  get maps(): string[]
  get votingCaptain(): string
  get isVotingStageEnd(): boolean
  get map(): string | undefined
  get readyToStart(): boolean
  get startedAt(): Date | undefined

  get owner(): string | undefined
  get gameID(): string | undefined
}
