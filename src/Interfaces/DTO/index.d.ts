import type { FormatTo, Parser } from './Formatter'
import type { DTO_TYPES } from './Types/index'

export namespace DTO {
  interface Object {
    /** ссылка на label внутри данных DTO */
    get label(): string
    set label(value: string)
    /** тип распаршенной DTO, определенный в момент парсинга входящих данных*/
    get type(): DTO_TYPES
    /** метаданные, полученные после парсинга DTO*/
    get metaInfo(): OBJECT_DATA
    /** метаданные, полученные после парсинга DTO */
    get content(): OBJECT_DATA

    get to(): FormatTo
  }

  /** Парсер данных из DTO и в DTO */
  namespace Parser {
    interface Instance extends Parser {}
  }

  /** Интерфейс, описывающий полезные данные , которые обязаны находиться в DTO */
  interface OBJECT_DATA {
    [key: string]: OBJECT_DATA | ATOMIC_DATA
    [key: number]: OBJECT_DATA | ATOMIC_DATA
  }

  /**Данные, которые являются конечными по вложенности*/
  type ATOMIC_DATA = string | number | boolean | null
}
