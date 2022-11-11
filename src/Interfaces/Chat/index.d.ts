import { IEntity, IManager } from '../Manager'

export declare namespace IChat {
  interface Manager extends IManager<Controller, string> {}

  interface Controller extends IEntity<string> {
    get type(): Type
    get id(): string
    get members(): Array<string>
    join(user: string): Promise<true> | never
    leave(user: string): Promise<true> | never
    message(msg: Message): Promise<true> | never
    delete(): Promise<true> | never
  }

  interface Message {
    author: string
    content: string
  }

  type Type = 'private' | 'command' | 'team' | 'lobby' | 'guild'
}
