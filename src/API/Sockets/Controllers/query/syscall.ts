import type { SyscallQuery } from '../../Handlers/queries'

import { DTO } from '../../../../Classes/DTO/DTO'
import { MODELS } from '../../../../Models/index'

import {
  isValidModelAction,
  MODELS_ACTION_LIST,
} from '../../../../configs/Models/actions'
import { ModelsManager } from '../../../../Classes/RoleManager/ModelsRolesManager'

import { TechnicalCause, TechnicalError } from '../../../../error'

let ModelsRoleManager = new ModelsManager()

export async function syscall(request: DTO) {
  const query = request.content.query as unknown as SyscallQuery
  switch (typeof query.model) {
    case 'undefined': {
      let results: Array<Promise<unknown>> = []
      let names: Array<string> = []
      for (let [name, model] of MODELS) {
        let val = model as any
        if (typeof val[query.execute.function] != 'function') continue
        names.push(name)
        results.push(
          val[query.execute.function].call(model, ...query.execute.params),
        )
      }

      return Promise.all(results).then((results) => {
        let response: Array<{ model: string; result: unknown }> = []
        for (let i = 0; i < names.length; i++)
          response.push({ model: names[i], result: results[i] })
        return response
      })
    }

    case 'string': {
      const model = MODELS.get(query.model as string) as any
      if (!model) throw new TechnicalError('model', TechnicalCause.NOT_EXIST)

      const action = `${query.model}/${query.execute.function}`
      if (!isValidModelAction(action))
        throw new TechnicalError('action', TechnicalCause.NOT_EXIST)

      const hasAccess = ModelsRoleManager.hasAccess(
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
          return model.findOne(query.filter).then(async (document: any) => {
            if (!document)
              throw new TechnicalError('document', TechnicalCause.NOT_EXIST)

            let result = await document[query.execute.function].call(
              document,
              ...query.execute.params,
            )
            await document.save()

            return result
          })
      }
    }
  }
}
