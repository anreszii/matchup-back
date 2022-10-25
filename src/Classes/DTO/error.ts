import type { DTO as DTO_NAMESPACE } from '../../Interfaces/index'
import { DTO } from './DTO'

export const enum PERFORMANCE_ERRORS {
  'wrong action' = `requested model or model method does not exist`,
  'wrong access level' = 'requested action require greater access level',
  'wrong parameters' = 'provided method params wrong',
  'wrong document' = 'requested document do not exist',
  'file read' = 'can not read file',
  'no data' = 'can not found content',
  'low balance' = 'insufficient funds for the operation',
  "can't drop relation" = 'can not delete relaiton with specified user',
  "can't add relation" = 'you are already friend or subscriber of specified user',
  'low mpr' = 'this action require more mpr to use it',
}

export class DTOError {
  private _asDTO!: DTO_NAMESPACE.Object
  private _label!: string | null

  constructor(error: PERFORMANCE_ERRORS | string, label?: string) {
    // if (TECHNICAL_ERRORS_LIST.has(error as TECHNICAL_ERRORS)) {
    //   this._createTechnical(
    //     TECHNICAL_ERRORS_LIST.get(error as TECHNICAL_ERRORS)!,
    //   )
    // } else
    this._createPerformance(error as string | PERFORMANCE_ERRORS)
    if (label) this._label = label
  }

  get toObject() {
    return this._asDTO
  }

  get content() {
    return this._asDTO.content
  }

  get label() {
    return this._label
  }

  set label(value: string | null) {
    this._label = value
  }

  _createPerformance(error: string) {
    this._asDTO = new DTO({
      label: this._label,
      status: error,
    })
  }

  // _createTechnical(errorCode: TECHNICAL_ERRORS) {
  //   this._asDTO = new DTO({
  //     label: this._label,
  //     errorCode: errorCode,
  //   })
  // }
}
