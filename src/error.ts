import type { DTO_TYPES } from './Interfaces/DTO/Types/index'
import { DTO } from './Classes/DTO/DTO'

export const enum TechnicalCause {
  INVALID_FORMAT = 'value format is invalid',
  INVALID = 'value is invalid',
  REQUIRED = 'value is required',
  NOT_EXIST = `value doesn't exist`,
  ALREADY_EXIST = `value already exist`,
  CAN_NOT_ADD = `value can't be added`,
  CAN_NOT_DELETE = `value can't be deleted`,
  CAN_NOT_UPDATE = `value can't be updated`,
  CAN_NOT_CREATE = `value can't be created`,
  NEED_HIGHER_VALUE = `value must be higher`,
  NEED_LOWER_VALUE = `value must be lower`,
}

export const enum ServerCause {
  UNKNOWN_ERROR = 500,
  OLD_API = 501,
  FAIL_TEST_DATA_GENERATION = 502,
  FAIL_TASK_GENERATION = 503,

  INVALID_ROUTE = 300,
  INVALID_DTO = 301,
}

export const SERVER_ERRORS_DESCRIPTIONS: Map<ServerCause, string> = new Map([
  [500, 'unknown error'],
  [501, 'old api'],
  [502, 'failed to generate test data'],
  [503, 'failed to generate user task'],
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
    return 'error'
  }

  get description() {
    return this.message
  }
}

export function isMatchUpError(value: unknown): value is MatchUpError {
  if (!value || typeof value != 'object') return false
  return 'DTO' in value
}
