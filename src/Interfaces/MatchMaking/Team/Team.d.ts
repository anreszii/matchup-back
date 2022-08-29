import { IEntity, Match, Chat } from '../../'

export interface ITeam extends IEntity<number> {
  join(name: string): Promise<boolean>
  leave(name: string): Promise<boolean>
  check(): Array<Match.Member.Instance>

  get chat(): Chat.Instance
  set chat(chat: Chat.Instance)

  set captain(name: string)
  get captain(): string
  isCaptain(member: Match.Member.Instance | string): boolean
}
