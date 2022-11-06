import type { DTO_TYPES } from './Interfaces/DTO/Types/index'
import { DTO } from './Classes/DTO/DTO'

export const enum TechnicalCause {
  INVALID_FORMAT = 'value format is invalid',
  INVALID = 'value is invalid',
  REQUIRED = 'value is required',
  NOT_EXIST = `value doesn't exist`,
  ALREADY_EXIST = `value already exist`,
  CAN_NOT_ADD = `can't add value`,
  CAN_NOT_DELETE = `can't delete value`,
  CAN_NOT_UPDATE = `can't update value`,
  NEED_HIGHER_VALUE = `value must be higher`,
  NEED_LOWER_VALUE = `value must be lower`,
}

export const enum ServerCause {
  UNKNOWN_ERROR = 500,
  OLD_API = 501,

  INVALID_ROUTE = 300,
  INVALID_DTO = 301,
}

export const SERVER_ERRORS_DESCRIPTIONS: Map<ServerCause, string> = new Map([
  [500, 'unknown error'],
  [501, 'old api'],
  [300, 'invalid route'],
  [301, 'invalid dto'],
])

interface hasDescription {
  get description(): string
}

export abstract class MatchUpError extends Error implements hasDescription {
  abstract get DTO(): DTO
  abstract get type(): DTO_TYPES
  abstract get description(): string
}

export class TechnicalError extends MatchUpError {
  constructor(
    private _key: string,
    private _cause: TechnicalCause,
    private _label: string = 'unknown',
  ) {
    super(`${_key}: ${_cause}`)
  }

  get DTO(): DTO {
    return new DTO({ label: this._label, status: `${this.message}` })
  }

  get type(): DTO_TYPES {
    return 'performance'
  }

  get description() {
    return this.message
  }
}

export class ServerError extends MatchUpError {
  constructor(private _cause: ServerCause, private _label: string = 'unknown') {
    super(`server error: ${_cause}`)
  }

  get DTO(): DTO {
    return new DTO({ label: this._label, error: `${this._cause}` })
  }

  get type(): DTO_TYPES {
    return 'performance'
  }

  get description() {
    return this.message
  }
}

export function isMatchUpError(value: unknown): value is MatchUpError {
  if (!value || typeof value != 'object') return false
  return 'DTO' in value
}
