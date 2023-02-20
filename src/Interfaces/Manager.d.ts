/**
 * Общий класс менеджеров сущностей T
 */
export declare interface IManager<T extends IEntity<ID>, ID> {
  /** Генерирует сущность T */
  spawn(...params: unknown[]): T | Promise<T>
  get(entityID: T['id']): T | Promise<T> | undefined | Promise<undefined>
  has(entityID: T['id']): boolean
  drop(entityID: T['id']): boolean | Promise<boolean>
}

export declare interface IEntity<ID> {
  get id(): ID
  set id(newID: ID)

  get readyToDrop(): boolean
  delete(): Promise<boolean> | boolean
}
