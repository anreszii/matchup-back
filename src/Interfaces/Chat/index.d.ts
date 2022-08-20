import { IManager } from '../index.js'
import { IChat } from './Chat.js'
import { IChatController } from './Controller.js'
import { IChatMember } from './Member.js'
import { IChatMessage } from './Message.js'

/**
 * @TODO
 * - Восстановление чата из БД ( Controller )
 * - Роли внутри чата ( Member )
 * - Добавление/удаление пользователей ()
 * - Проверки на удаление чата
 * - Отпарвка сообщений ( Message )
 * - Удаление сообщений ( Message )
 * - Изменение сообщений ( Message )
 */

export declare namespace Chat {
  interface Instance extends IChat {}
  interface Member extends IChatMember {}
  interface Message extends IChatMessage {}
  namespace Controller {
    interface Interface extends IChatController {}
    namespace Factory {
      type supportedControllers = 'gamesocket.io'
      abstract class Interface {
        static create(
          controllerName: supportedControllers,
          options?: { [key: string]: string },
        ): Chat.Controller.Interface
      }
    }
  }
  interface Manager extends IManager<Chat.Instance, number> {
    spawn(
      controller: Chat.Controller.Factory.supportedControllers,
      options?: { [key: string]: string },
    ): Chat.Instance
  }
  type userRole = 'user' | 'moderator'
}
