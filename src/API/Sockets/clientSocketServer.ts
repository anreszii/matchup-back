/**
 *
 * Для взаимодействия с клиентским сервером необходимо подключиться к ws://server.name:PORT/client
 * И передавать в пакете JSON объект, содержащий поле event, а также оговоренные в конкретном хэндлере поля
 *
 * В случае ошибок шлет на ${event} error объект JSON с полем reason
 * @module LobbyHandlers
 * @packageDocumentation
 */

import { IDataEscort } from 'gamesocket.io'
import { WS_SERVER } from '../../app'
import { PLAYERS } from '../../Classes/MatchMaking/MemberManager'
import { StandOff_Lobbies } from '.'

export let clientServer = WS_SERVER.of(process.env.CLIENT_NAMESPACE!)
clientServer.on('close', async (escort: IDataEscort) => {
  let socket = escort.get('socket') as { [key: string]: any }
  if (typeof socket.username == 'string') {
    let player = await PLAYERS.get(socket.username)
    if (!player.lobbyID) return

    let lobby = StandOff_Lobbies.get(player.lobbyID)
    if (!lobby) return (player.lobbyID = undefined)

    if (lobby.state == 'searching') await lobby.leave(player.name)
  }
})
