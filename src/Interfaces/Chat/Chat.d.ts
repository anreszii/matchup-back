import type { IEntity } from '../Manager'
import type { Chat } from './'

export interface IChat extends IEntity<number> {
  get controller(): Chat.Controller.Interface
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
}
