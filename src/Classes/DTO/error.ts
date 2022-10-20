import type { DTO as DTO_NAMESPACE } from '../../Interfaces/index'
import { DTO } from './DTO'

export const enum PERFORMANCE_ERRORS {
  'wrong action' = 'запрашиваемая модель или метод не существуют',
  'wrong access level' = 'низкий уровень доступа для выполнения действия',
  'wrong parameters' = 'переданные параметры неверны',
  'wrong document' = 'указанный документ не найден',
  'no data' = 'нет полезных данных',
  'low balance' = 'недостаточный баланс для выполнения операции',
  "can't drop relation" = 'вы с этим пользователем не состоите в друзьях и не подписаны на него',
  "can't add relation" = 'вы уже подписаны на пользователя',
  'low mpr' = 'сликшом мало очков рейтинга для выполнения действия',
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
