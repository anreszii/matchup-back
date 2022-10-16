import type { DTO } from '../index'
import type { DTO_TYPES } from './index'

export interface BASIC_DTO {
  /** Полезные даннные, которые удаляются при транспортировке и парсятся при создании объекта */
  metaInfo: DTO.OBJECT_DATA & { type: DTO_TYPES }
  /** Полезные данные, которые не изменяются при форматировании */
  content: DTO.OBJECT_DATA & { label: string }
}
