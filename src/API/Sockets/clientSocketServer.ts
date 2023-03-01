/**
 *
 * Для взаимодействия с клиентским сервером необходимо подключиться к ws://server.name:PORT/client
 * И передавать в пакете JSON объект, содержащий поле event, а также оговоренные в конкретном хэндлере поля
 *
 * В случае ошибок шлет на ${event} error объект JSON с полем reason
 * @module LobbyHandlers
 * @packageDocumentation
 */

import type { IDataEscort } from 'gamesocket.io'

import { Logger } from '../../Utils/Logger'
const logger = new Logger('Web Socket Server', 'Close listener')
import { WS_SERVER } from '../../app'
export const clientServer = WS_SERVER.of(process.env.CLIENT_NAMESPACE!)

import { PLAYERS } from '../../Classes/MatchMaking/Player/Manager'
import { PlayerSignals } from '../../Interfaces/MatchMaking/Player'

clientServer.on('close', async (escort: IDataEscort) => {
  let socket = escort.get('socket') as { [key: string]: any }
  logger.info(
    `[SOCKET ${socket.id}] LEAVED. CODE: ${escort.get(
      'code',
    )}. MESSAGE: ${escort.get('message')}`,
  )
  if (typeof socket.username == 'string') {
    const socketAliases = clientServer.Aliases.get(socket.username)!
    clientServer.Aliases.delete(socket.username, socket.id)
    if (socketAliases.length == 0) clientServer.Aliases.remove(socket.username)

    if (!PLAYERS.has(socket.username)) return
    const player = PLAYERS.get(socket.username)!

    if (socketAliases.length == 0) return player.event(PlayerSignals.delete)
  }
})
