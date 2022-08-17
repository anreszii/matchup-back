/**
 * Общий класс менеджеров сущностей T
 */
export declare interface IManager<T extends IEntity<ID>, ID> {
  /** Генерирует сущность T */
  spawn(): T
  get(entityID: T['id']): T | undefined
  has(entityID: T['id']): boolean
  drop(entityID: T['id']): boolean
}

export declare interface IEntity<ID> {
  get id(): ID
  set id(newID: ID)
}
