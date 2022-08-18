import { IEntity } from '../Manager'

/**
 * @TODO
 * - Восстановление чата из БД
 * - Роли внутри чата
 * - Добавление/удаление пользователей
 * - Проверки на удаление чата
 */
export declare interface IChat extends IEntity<number> {
  delete(): Promise<boolean>
}
