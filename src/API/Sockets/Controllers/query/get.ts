import type { ModelType } from '@typegoose/typegoose/lib/types'
import type { Query } from '../../Handlers/queries'

import { DTO } from '../../../../Classes/DTO/DTO'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { transformToRegExp } from '../../../../Utils/transformToRegExp'

export async function get(
  model: ModelType<any>,
  request: DTO,
): Promise<unknown | unknown[]> {
  let query = request.content.query as unknown as Query
  const filter = transformToRegExp(query.filter)
  let documents = await model.find(filter, query.fields)
  if (!documents) throw new TechnicalError('document', TechnicalCause.NOT_EXIST)

  return documents
}
