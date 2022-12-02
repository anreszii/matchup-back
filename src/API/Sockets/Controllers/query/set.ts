import type { ModelType } from '@typegoose/typegoose/lib/types'
import type { Query } from '../../Handlers/queries'

import { DTO } from '../../../../Classes/DTO/DTO'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { transformToRegExp } from '../../../../Utils/transformToRegExp'

export async function set(model: ModelType<any>, request: DTO) {
  let query = request.content.query as unknown as Query
  if (!query.update)
    throw new TechnicalError('query.update', TechnicalCause.REQUIRED)
  if (typeof query.update != 'object')
    throw new TechnicalError('query.update', TechnicalCause.INVALID_FORMAT)

  const filter = transformToRegExp(query.filter)
  const setOptions = query.update.set

  switch (query.update.count) {
    case 'one':
      await model.updateOne(filter, setOptions)
      return true

    case 'many':
      await model.updateMany(filter, setOptions)
      return true

    default:
      throw new TechnicalError('query count', TechnicalCause.INVALID_FORMAT)
  }
}
