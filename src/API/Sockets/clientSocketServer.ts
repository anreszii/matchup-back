/**
 *
 * Для взаимодействия с клиентским сервером необходимо подключиться к ws://server.name:PORT/client
 * И передавать в пакете JSON объект, содержащий поле event, а также оговоренные в конкретном хэндлере поля
 *
 * В случае ошибок шлет на ${event} error объект JSON с полем reason
 * @module LobbyHandlers
 * @packageDocumentation
 */

import io from 'gamesocket.io'
import {
  addMember,
  createMatch,
  findMatch,
  removeMember,
  syncLobby,
} from './matchHandlers'
import { authorize } from './basicHandlers'

export let app = io()

let clientServer = app.of('client')

clientServer.on('authorize', authorize)
clientServer.on('create_match', createMatch)
clientServer.on('find_match', findMatch)
clientServer.on('sync_lobby', syncLobby)
clientServer.on('add_member', addMember)
clientServer.on('remove_member', removeMember)

app.listen(Number(process.env.PORT), (ls) => {
  if (ls) console.log(`listening websockets on ${process.env.PORT}`)
})
