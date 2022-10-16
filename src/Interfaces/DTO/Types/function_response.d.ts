import type { BASIC_DTO } from './basic'

/**
 * Используется для void функций, от которых требуется получить статус выполнения или программную ошибку
 */
export interface FunctionStatusDTO extends BASIC_DTO {
  metaInfo: {
    type: 'performance'
  }
  content: {
    label: string

    /**статус выполнения void операции*/
    status: 'success' | string
  }
}
