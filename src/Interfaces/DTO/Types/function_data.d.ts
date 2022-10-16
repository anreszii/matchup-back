import type { BASIC_DTO } from './basic'

export interface FunctionDataDTO extends BASIC_DTO {
  metaInfo: { type: 'data' }
  content: {
    label: string

    /** Описание ошибки */
    error?: string
  }
}
