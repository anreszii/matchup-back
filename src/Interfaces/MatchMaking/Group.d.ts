import { IEntity } from '../Manager'
import { IChat, Match } from '../index'
import { Name } from './Player'

export interface Group<T> extends IEntity<T> {
  join(player: Name): Promise<boolean> | boolean
  leave(player: Name): Promise<boolean> | boolean

  hasSpaceFor(size: number): boolean

  get players(): Map<Name, Match.Player.Instance>
  get playersData(): Array<Match.Player.Data>

  get GRI(): number
  get size(): number

  get chat(): IChat.Controller
  get isGuild(): boolean
}
