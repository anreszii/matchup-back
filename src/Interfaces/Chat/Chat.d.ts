import type { IEntity } from '../Manager'
import type { Chat } from './'

export type ChatMessage = {
  from: string
  content: string
}

export interface IChat extends IEntity<string> {
  get controller(): Chat.Controller.Instance
  /**
   * @param member - пользователь, над которым происходит действие
   * @param executor - пользователь, который вызвал действие
   * @returns результат выполнения операции
   */
  addMember(member: Chat.Member, executor?: Chat.Member): Promise<boolean>

  /**
   * @param member - пользователь, над которым происходит действие
   * @param executor - пользователь, который вызвал действие
   * @returns результат выполнения операции
   */
  deleteMember(member: Chat.Member, executor?: Chat.Member): Promise<boolean>
  send(message: ChatMessage): Promise<boolean>

  has(memberName: string): boolean
}
