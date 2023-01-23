import { DTO } from '../index'
import { WebSocket } from 'uWebSockets.js'
import { IEntity, IManager } from '../Manager'

type PromiseOrValue<T> = Promise<T> | T

export declare namespace IChat {
  interface Manager extends IManager<Controller, string> {}

  interface Controller extends IEntity<string> {
    get type(): Type
    get id(): string
    get members(): Array<string>
    connect(socket: WebSocket): void
    join(user: string): PromiseOrValue<true | never>
    forceJoin(user: string): void
    leave(user: string): PromiseOrValue<true | never>
    message(msg: Message): PromiseOrValue<true | never>
    send(event: string, content: DTO.Object): void
    drop(): PromiseOrValue<true | never>
  }

  interface Message {
    author: Author
    content: string
  }

  type Author = {
    name: string
    avatar?: string
    prefix?: string
  }

  type PossibleString = string | undefined

  type Type = 'private' | 'command' | 'team' | 'lobby' | 'guild'
}
