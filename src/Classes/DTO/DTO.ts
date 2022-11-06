import type { DTO_TYPES } from '../../Interfaces/DTO/Types/index'
import type { DTO as DTO_NAMESPACE } from '../../Interfaces/index'
import { dtoParser } from './Parser/Parser'

import {
  SERVER_ERRORS_DESCRIPTIONS,
  TechnicalCause,
  TechnicalError,
} from '../../error'
import { FormatTo } from '../../Interfaces/DTO/Formatter'

export class DTO implements DTO_NAMESPACE.Object {
  private _content!: DTO_NAMESPACE.OBJECT_DATA
  private _metaInfo!: DTO_NAMESPACE.OBJECT_DATA
  private _type!: DTO_TYPES
  constructor(content: unknown) {
    if (typeof content != 'object' || !content)
      throw new TechnicalError('DTO content', TechnicalCause.REQUIRED)

    this._content = content as DTO_NAMESPACE.OBJECT_DATA
    this._specify()
  }

  get label(): string {
    return this._content.label as string
  }

  get type(): DTO_TYPES {
    return this._type
  }

  get metaInfo(): DTO_NAMESPACE.OBJECT_DATA {
    return this._content
  }

  get content(): DTO_NAMESPACE.OBJECT_DATA {
    return this._content
  }

  get to(): FormatTo {
    return dtoParser.to
  }

  private _specify() {
    this._specifyType()
    this._specifyMetaInfo()
  }

  private _specifyMetaInfo() {
    this._metaInfo = { type: this._type }
    switch (this._type) {
      case 'error': {
        this._metaInfo.errorDescription = SERVER_ERRORS_DESCRIPTIONS.get(
          this._content.error as number,
        )!
        break
      }
      default: {
        break
      }
    }
  }

  private _specifyType(): DTO_TYPES {
    let content = this._content
    if (content.status) return 'performance'
    if (content.errorCode) return 'error'
    if (content.label) return 'data'
    throw new ValidationError('DTO content', validationCause.INVALID_FORMAT)
  }
}
