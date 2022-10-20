import type { IDataEscort } from 'gamesocket.io'
import { Models } from '../../../Models/index'
import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'

import { WebSocketValidatior } from '../../../validation/index'
import { MatchUpError, validationCause, ValidationError } from '../../../error'
import { ModelsManager } from '../../../Classes/RoleManager/ModelsRolesManager'
import { isValidModelAction } from '../../../configs/Models/actions'
import { DTOError, PERFORMANCE_ERRORS } from '../../../Classes/DTO/error'
import { DTO, DTO_FORMATTER } from '../../../Classes/DTO/DTO'

let ModelsRoleManager = new ModelsManager()

interface Query {
  method: 'get' | 'set'
  model: string
  filter: Object
  needFeedback: boolean
  fields?: string
  update?: {
    count: 'one' | 'many'
    set: Object | Array<unknown>
  }
}
let wsValidator = new WebSocketValidatior(WS_SERVER)
export async function query(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let query = escort.get('query') as Query | string | undefined
    if (typeof query != 'object')
      throw new ValidationError('query', validationCause.INVALID_FORMAT)

    let model = Models.get(query.model)
    if (!model) throw new ValidationError('model', validationCause.INVALID)

    let label = escort.get('label')
    if (typeof label != 'string')
      throw new ValidationError('label', validationCause.INVALID_FORMAT)

    switch (query.method) {
      case 'get': {
        let documents = await model.find(query.filter, query.fields)
        if (!documents)
          throw new DTOError(PERFORMANCE_ERRORS['wrong document'], label)

        const dto = new DTO({ label, receivedData: { ...documents } })
        return clientServer
          .control(socketID)
          .emit('query', DTO_FORMATTER.JSON.toDTO(dto))
      }

      case 'set': {
        if (!query.update)
          throw new ValidationError('query.update', validationCause.REQUIRED)
        let dto: DTO | undefined
        switch (query.update.count) {
          case 'one': {
            dto = new DTO({
              label,
              updateResult: await model.updateOne(
                query.filter,
                query.update.set,
              ),
            })

            break
          }

          case 'many':
            dto = new DTO({
              label,
              updateResult: await model.updateMany(
                query.filter,
                query.update.set,
              ),
            })

            break
        }

        if (query.needFeedback != true)
          dto = new DTO({ label, status: 'success' })

        return clientServer
          .control(socketID)
          .emit('query', DTO_FORMATTER.JSON.toDTO(dto))
      }

      default: {
        throw new ValidationError('method', validationCause.INVALID)
      }
    }
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof DTOError) {
      let label = escort.get('label') as string
      if (!e.label) e.label = label
      return clientServer
        .control(socketID)
        .emit('query error', DTO_FORMATTER.JSON.toDTO(e.toObject))
    }
    if (e instanceof MatchUpError) {
      let label = escort.get('label') as string
      const DTO = e.toDto
      if (!DTO.label) DTO.label = label
      return clientServer
        .control(socketID)
        .emit('query error', DTO_FORMATTER.JSON.toDTO(DTO.toObject))
    }
    if (e instanceof Error)
      return clientServer
        .control(socketID)
        .emit('query error', { reason: e.message })

    clientServer
      .control(escort.get('socket_id') as string)
      .emit('query error', { reason: 'unknown error' })
  }
}
clientServer.on('query', query)

interface SyscallQuery {
  model?: string
  filter?: Object
  needFeedback: true | undefined
  execute: {
    function: string
    params: Array<string>
  }
}
export async function syscall(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string

    let query = escort.get('query') as SyscallQuery | string | undefined
    if (typeof query != 'object')
      throw new ValidationError('query', validationCause.REQUIRED)

    let label = escort.get('label')
    if (typeof label != 'string')
      throw new ValidationError('label', validationCause.INVALID_FORMAT)

    if (!query.execute.params) query.execute.params = []

    switch (typeof query.model) {
      case 'undefined': {
        let result: Array<string> = []
        let dto: DTO | undefined
        for (let [name, model] of Models) {
          let val = model as any
          if (typeof val[query.execute.function] != 'function') continue
          let dto = new DTO({
            label,
            database: name,
            callResult: await val[query.execute.function].call(
              model,
              ...query.execute.params,
            ),
          })

          result.push(DTO_FORMATTER.JSON.toDTO(dto))
        }

        if (query.needFeedback)
          dto = new DTO({ label, callResult: JSON.stringify(result) })
        else dto = new DTO({ label, status: 'success' })

        return clientServer
          .control(socketID)
          .emit('syscall', DTO_FORMATTER.JSON.toDTO(dto))
      }

      case 'string': {
        let model = Models.get(query.model) as any
        if (!model) throw new ValidationError('model', validationCause.INVALID)

        let action = `${query.model}/${query.execute.function}`
        if (!isValidModelAction(action))
          throw new DTOError(PERFORMANCE_ERRORS['wrong action'], label)

        let hasAccess = ModelsRoleManager.hasAccess(username, action)
        if (!hasAccess)
          throw new DTOError(PERFORMANCE_ERRORS['wrong access level'], label)

        switch (typeof query.filter) {
          case 'undefined': {
            let dto: DTO | undefined
            let queryResult = await model[query.execute.function].call(
              model,
              ...query.execute.params,
            )
            if (query.needFeedback === true)
              dto = new DTO({
                label,
                callResult: {
                  ...queryResult,
                },
              })
            else dto = new DTO({ label, status: 'success' })

            return clientServer
              .control(socketID)
              .emit('syscall', DTO_FORMATTER.JSON.toDTO(dto))
          }

          case 'object': {
            let dto: DTO | undefined
            let document = await model.findOne(query.filter)
            if (!document)
              throw new DTOError(PERFORMANCE_ERRORS['wrong document'], label)

            let queryResult = await document[query.execute.function].call(
              document,
              ...query.execute.params,
            )
            await document.save()

            if (query.needFeedback === true)
              dto = new DTO({ label, callResult: { ...queryResult } })
            else dto = new DTO({ label, status: 'success' })

            return clientServer
              .control(socketID)
              .emit('syscall', DTO_FORMATTER.JSON.toDTO(dto))
          }
        }
      }
    }
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof DTOError) {
      let label = escort.get('label') as string
      if (!e.label) e.label = label
      return clientServer
        .control(socketID)
        .emit('syscall error', DTO_FORMATTER.JSON.toDTO(e.toObject))
    }
    if (e instanceof MatchUpError) {
      let label = escort.get('label') as string
      const DTO = e.toDto
      if (!DTO.label) DTO.label = label
      return clientServer
        .control(socketID)
        .emit('syscall error', DTO_FORMATTER.JSON.toDTO(DTO.toObject))
    }
    if (e instanceof Error)
      return clientServer
        .control(socketID)
        .emit('syscall error', { reason: e.message })

    clientServer
      .control(escort.get('socket_id') as string)
      .emit('syscall error', { reason: 'unknown error' })
  }
}
clientServer.on('syscall', syscall)
