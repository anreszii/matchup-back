import type { IDataEscort } from 'gamesocket.io'
import { Models } from '../../../Models/index'
import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'

import { WebSocketValidatior } from '../../../validation/index'
import { MatchUpError, validationCause, ValidationError } from '../../../error'

interface Query {
  method: 'get' | 'set'
  model: string
  filter: Object
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
          throw new ValidationError('document', validationCause.NOT_EXIST)

        return clientServer
          .control(socketID)
          .emit('query', JSON.stringify({ label, data: documents }))
      }

      case 'set': {
        if (!query.update)
          throw new ValidationError('query.update', validationCause.REQUIRED)
        if (query.update.count == 'one')
          return clientServer.control(socketID).emit(
            'query',
            JSON.stringify({
              label,
              data: await model.updateOne(query.filter, query.update.set),
            }),
          )
        return clientServer.control(socketID).emit(
          'query',
          JSON.stringify({
            label,
            data: await model.updateMany(query.filter, query.update.set),
          }),
        )
      }

      default: {
        throw new ValidationError('method', validationCause.INVALID)
      }
    }
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('authorize error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('authorize error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('authorize error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('query', query)

interface SyscallQuery {
  model: string
  filter?: Object
  execute: {
    function: string
    params: Array<string>
  }
}
export async function syscall(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let query = escort.get('query') as SyscallQuery | string | undefined
    if (typeof query != 'object')
      throw new ValidationError('query', validationCause.INVALID_FORMAT)

    let model = Models.get(query.model) as any
    if (!model) throw new ValidationError('model', validationCause.INVALID)

    let label = escort.get('label')
    if (typeof label != 'string')
      throw new ValidationError('label', validationCause.INVALID_FORMAT)

    if (!query.filter)
      return clientServer.control(socketID).emit('syscall', {
        label,
        data: await model[query.execute.function].call(
          model,
          ...query.execute.params,
        ),
      })

    let document = await model.findOne(query.filter)
    if (!document)
      throw new ValidationError('document', validationCause.NOT_EXIST)

    let result = await document[query.execute.function].call(
      document,
      ...query.execute.params,
    )
    await document.save()
    return clientServer
      .control(socketID)
      .emit('syscall', JSON.stringify({ label, data: result }))
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('authorize error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('authorize error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('authorize error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('syscall', syscall)
