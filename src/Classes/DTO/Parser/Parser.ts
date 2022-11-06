import type { DTO as DTO_NAMESPACE } from '../../../Interfaces/index'
import {
  ServerCause,
  ServerError,
  TechnicalCause,
  TechnicalError,
} from '../../../error'
import { FormatFrom, FormatTo } from '../../../Interfaces/DTO/Formatter'
import { DTO } from '../DTO'

class Parser implements DTO_NAMESPACE.Parser.Instance {
  private _formatTo?: FormatTo
  private _formatFrom = new From()

  constructor(private _dto?: DTO_NAMESPACE.Object) {
    if (_dto) this._formatTo = new To(_dto)
  }

  get to(): FormatTo {
    if (!this._formatTo)
      throw new TechnicalError('parser', TechnicalCause.NOT_EXIST)
    return this._formatTo
  }

  get from(): FormatFrom {
    return this._formatFrom
  }
}

class To implements FormatTo {
  constructor(private _value: DTO_NAMESPACE.Object) {}
  get JSON(): string {
    return JSON.stringify(this._value.content)
  }
}

class From implements FormatFrom {
  JSON(value: unknown): DTO {
    try {
      if (!value || typeof value != 'string')
        throw new ServerError(ServerCause.INVALID_DTO)
      return this.Object(JSON.parse(value))
    } catch (e) {
      throw new ServerError(ServerCause.INVALID_DTO)
    }
  }

  Object(value: unknown): DTO {
    try {
      if (
        value !== null ||
        (typeof value !== 'object' && !('content' in value && 'label' in value))
      )
        throw new ServerError(ServerCause.INVALID_DTO)
      return new DTO(value)
    } catch (e) {
      throw new ServerError(ServerCause.INVALID_DTO)
    }
  }
}

export const dtoParser = new Parser()
