import { IEntity } from '../Manager'
import { IChat, Match } from '../index'

export interface Group<T> extends IEntity<T> {
  join(name: string): Promise<boolean>
  leave(name: string): Promise<boolean>

  hasSpaceFor(size: number): boolean

  get chat(): IChat.Controller

  get GRI(): number
  get size(): number

  get members(): Match.Member.List
  get isGuild(): boolean
}
