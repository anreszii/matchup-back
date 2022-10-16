import type { BASIC_DTO } from './basic'

export interface TechnicalErrorDTO extends BASIC_DTO {
  metaInfo: {
    errorDescription: string
    type: 'error'
  }
  content: {
    label: string

    /** код серверной ошибки */
    errorCode: number
  }
}
