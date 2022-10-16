import type { FormatJSON } from './Formats/JSON'
import { DTO } from './index'

export interface Parser {
  get JSON(): FormatJSON
}

export interface Formatter {
  toDTO(entity: DTO.Object): unknown
  toObject(entity: unknown): DTO.Object
}
