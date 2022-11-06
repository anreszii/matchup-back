import type { IDataEscort } from 'gamesocket.io'
import { MODELS } from '../../../Models/index'
import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'

import {
  isMatchUpError,
  ServerCause,
  ServerError,
  TechnicalCause,
  TechnicalError,
} from '../../../error'

import { DTO } from '../../../Classes/DTO/DTO'
import { get } from '../Controllers/query/get'
import { set } from '../Controllers/query/set'
import { syscall } from '../Controllers/query/syscall'
import { dtoParser } from '../../../Classes/DTO/Parser/Parser'
import { WebSocketValidatior } from '../../../validation/websocket'

let wsValidator = new WebSocketValidatior(WS_SERVER)

export interface Query {
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
export async function HQuery(escort: IDataEscort) {
  try {
    let response: DTO

    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    const request = dtoParser.from.Object(escort.used)

    let query = request.content.query as Query | string | undefined
    if (!query || typeof query != 'object')
      throw new TechnicalError('query', TechnicalCause.INVALID_FORMAT)

    let model = MODELS.get(query.model)
    if (!model) throw new TechnicalError('model', TechnicalCause.NOT_EXIST)

    switch (query.method) {
      case 'get':
        get(model, request).then((result) => {
          if (result == true)
            response = new DTO({
              label: request.label,
              status: 'success',
            })
          else
            response = new DTO({
              label: request.label,
              response: result,
            })

          clientServer.control(socketID).emit('query', response.to.JSON)
        })
        break

      case 'set':
        set(model, request).then((result) => {
          if (result == true)
            response = new DTO({
              label: request.label,
              status: 'success',
            })
          else
            response = new DTO({
              label: request.label,
              response: result,
            })

          clientServer.control(socketID).emit('query', response.to.JSON)
        })
        break

      default:
        throw new TechnicalError('method', TechnicalCause.NOT_EXIST)
    }
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    const request = dtoParser.from.Object(escort.used)

    let error: DTO
    if (!isMatchUpError(e))
      error = new ServerError(ServerCause.UNKNOWN_ERROR).DTO
    else error = e.DTO

    error.label = request.label
    return clientServer.control(socketID).emit(`query`, error.to.JSON)
  }
}
clientServer.on('query', HQuery)

export interface SyscallQuery {
  model?: string
  filter?: Object
  needFeedback: true | undefined
  execute: {
    function: string
    params: Array<string>
  }
}
export async function HSyscall(escort: IDataEscort) {
  try {
    let response: DTO
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    const request = dtoParser.from.Object(escort.used)

    let socket = WS_SERVER.sockets.get(socketID)!
    request.content.username = socket.username

    let query = request.content.query as SyscallQuery | string | undefined
    if (typeof query != 'object')
      throw new TechnicalError('query', TechnicalCause.INVALID_FORMAT)

    if (!query.execute.params)
      throw new TechnicalError('params', TechnicalCause.REQUIRED)

    syscall(request).then((result) => {
      if (result == true)
        response = new DTO({
          label: request.label,
          status: 'success',
        })
      else
        response = new DTO({
          label: request.label,
          response: result,
        })

      return clientServer.control(socketID).emit('syscall', response.to.JSON)
    })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    const request = dtoParser.from.Object(escort.used)

    let error: DTO
    if (!isMatchUpError(e))
      error = new ServerError(ServerCause.UNKNOWN_ERROR).DTO
    else error = e.DTO

    error.label = request.label
    return clientServer.control(socketID).emit(`syscall`, error.to.JSON)
  }
}
clientServer.on('syscall', HSyscall)
