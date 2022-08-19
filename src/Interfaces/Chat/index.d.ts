import { IManager } from '../'
import { IChatController } from './Controller'
import { IChatMember } from './Member'
import { IChatMessage } from './Message'

/**
 * @TODO
 * - Восстановление чата из БД
 * - Роли внутри чата
 * - Добавление/удаление пользователей
 * - Проверки на удаление чата
 */

export declare namespace Chat {
  interface Member extends IChatMember {}
  interface Message extends IChatMessage {}
  interface Controller extends IChatController {}
  interface Manager extends IManager<Chat.Controller, number> {}
}
