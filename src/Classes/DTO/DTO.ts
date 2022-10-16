import type { DTO_TYPES } from '../../Interfaces/DTO/Types/index'
import type { DTO as DTO_NAMESPACE } from '../../Interfaces/index'

import { validationCause, ValidationError } from '../../error'
import { FormatJSON } from '../../Interfaces/DTO/Formats/JSON'

export class DTO implements DTO_NAMESPACE.Object {
  private _content!: DTO_NAMESPACE.OBJECT_DATA
  private _metaInfo!: DTO_NAMESPACE.OBJECT_DATA
  private _type!: DTO_TYPES
  constructor(content: DTO_NAMESPACE.OBJECT_DATA) {
    if (typeof content != 'object' || !content)
      throw new ValidationError('DTO content', validationCause.INVALID_FORMAT)

    this._content = content
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

  private _specify() {
    this._specifyType()
    this._specifyMetaInfo()
  }

  private _specifyMetaInfo() {
    this._metaInfo = { type: this._type }
    switch (this._type) {
      // case 'error': {
      //   this._metaInfo.errorDescription = TECHNICAL_ERRORS_LIST.get(
      //     this._content.error as TECHNICAL_ERRORS,
      //   )!
      //   break
      // }
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

class Formatter implements DTO_NAMESPACE.Formatter {
  private _json = new JSONFormatter()
  get JSON(): FormatJSON {
    return this._json
  }
}

class JSONFormatter implements FormatJSON {
  toDTO(entity: DTO_NAMESPACE.Object): string {
    return JSON.stringify(entity.content)
  }

  toObject(entity: string): DTO_NAMESPACE.Object {
    return JSON.parse(entity)
  }
}

export const DTO_FORMATTER = new Formatter()
