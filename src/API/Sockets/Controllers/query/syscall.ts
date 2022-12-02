import type { SyscallQuery } from '../../Handlers/queries'

import { DTO } from '../../../../Classes/DTO/DTO'
import { MODELS } from '../../../../Models/index'

import {
  isValidModelAction,
  MODELS_ACTION_LIST,
} from '../../../../configs/Models/actions'
import { ModelsManager } from '../../../../Classes/RoleManager/ModelsRolesManager'

import { TechnicalCause, TechnicalError } from '../../../../error'
import { transformToRegExp } from '../../../../Utils/transformToRegExp'

let ModelsRoleManager = new ModelsManager()

export async function syscall(request: DTO) {
  const query = request.content.query as unknown as SyscallQuery
  switch (typeof query.model) {
    case 'undefined': {
      let response = []
      for (let [name, model] of MODELS) {
        let val = model as any
        if (typeof val[query.execute.function] != 'function') continue
        response.push({
          model: name,
          result: await val[query.execute.function].call(
            model,
            ...query.execute.params,
          ),
        })
      }

      let i = 0
      for (let record of response) if (record.result == true) i++

      return i == response.length ? true : response
    }

    case 'string': {
      const model = MODELS.get(query.model as string) as any
      if (!model) throw new TechnicalError('model', TechnicalCause.NOT_EXIST)

      const action = `${query.model}/${query.execute.function}`
      if (!isValidModelAction(action))
        throw new TechnicalError('action', TechnicalCause.NOT_EXIST)

      const hasAccess = await ModelsRoleManager.hasAccess(
        request.content.username as string,
        action as MODELS_ACTION_LIST,
      )
      if (!hasAccess)
        throw new TechnicalError(
          'access level',
          TechnicalCause.NEED_HIGHER_VALUE,
        )

      switch (typeof query.filter) {
        case 'undefined':
          return await model[query.execute.function].call(
            model,
            ...query.execute.params,
          )

        case 'object':
          const filter = transformToRegExp(query.filter)
          let document = await model.findOne(filter)
          if (!document)
            throw new TechnicalError('document', TechnicalCause.NOT_EXIST)

          let result = await document[query.execute.function].call(
            document,
            ...query.execute.params,
          )
          await document.save()

          return result
      }
    }
  }
}
