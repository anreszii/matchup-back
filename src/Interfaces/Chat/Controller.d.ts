import type { Chat } from './'

export interface IChatController {
  delete(executor?: Chat.Member): Promise<boolean>

  /**
   * @param member - пользователь, над которым происходит действие
   * @param executor - пользователь, который вызвал действие
   * @returns результат выполнения операции
   */
  addMember(member: Chat.Member): Promise<boolean> | boolean

  /**
   * @param member - пользователь, над которым происходит действие
   * @param executor - пользователь, который вызвал действие
   * @returns результат выполнения операции
   */
  deleteMember(member: Chat.Member): Promise<boolean> | boolean

  send(message: Chat.Message): Promise<boolean> | boolean

  set namespace(value: string)
  set roomName(value: string)
}
