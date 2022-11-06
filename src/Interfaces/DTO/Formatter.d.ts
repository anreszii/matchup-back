import type { DTO as DTO_NAMESPACE } from './index'
import type { DTO } from '../../Classes/DTO/DTO'

export interface Parser {
  get to(): FormatTo
  get from(): FormatFrom
}

interface FormatTo {
  get JSON(): string
}

interface FormatFrom {
  JSON(value: unknown): DTO
  Object(value: unknown): DTO
}
