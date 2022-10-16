import { Formatter } from '../Formatter'
import { DTO } from '../index'

export interface FormatJSON extends Formatter {
  toDTO(entity: DTO.Object): string
  toObject(entity: string): DTO.Object
}
