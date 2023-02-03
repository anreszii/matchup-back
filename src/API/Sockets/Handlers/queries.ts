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
import { Logger } from '../../../Utils/Logger'

let wsValidator = new WebSocketValidatior(WS_SERVER)

export interface Query {
  method: 'get' | 'set'
  model: string
  needFeedback: boolean
  aggregation?: Object
  filter?: Object
  fields?: string
  update?: {
    count: 'one' | 'many'
    set: Object | Array<unknown>
  }
}
export async function HQuery(escort: IDataEscort) {
  const logger = new Logger('query')
  logger.trace(`[REQUETS] DATA: ${JSON.stringify(escort.used)}`)
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

    let result: unknown
    switch (query.method) {
      case 'get':
        result = await get(model, request)
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

        return clientServer.control(socketID).emit('query', response.to.JSON)

      case 'set':
        result = await set(model, request)
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

        return clientServer.control(socketID).emit('query', response.to.JSON)

      default:
        throw new TechnicalError('method', TechnicalCause.NOT_EXIST)
    }
  } catch (e) {
    if (e instanceof Error)
      logger.warning(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
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
  const logger = new Logger('syscall')
  logger.trace(`[REQUETS] DATA: ${JSON.stringify(escort.used)}`)
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

    let result = await syscall(request)
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
  } catch (e) {
    if (e instanceof Error)
      logger.warning(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
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
