import { IManager } from '../'
import { IChat } from './Chat'
import { IChatController } from './Controller'
import { IChatMember } from './Member'
import { IChatMessage } from './Message'

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
    interface Instance extends IChatController {}
    namespace Factory {
      type supportedControllers = 'gamesocket.io'
      abstract class Interface {
        static create(
          controllerName: supportedControllers,
          options?: { [key: string]: string },
        ): Chat.Controller.Instance
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
