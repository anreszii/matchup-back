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
import * as Handlers from './Handlers'

export let app = io()

let clientServer = app.of('client')

/* Basic handlers for user authorization */
clientServer.on('authorize', Handlers.authorize)
clientServer.on('change_role', Handlers.changeRole)

/* Handlers for admins only */
clientServer.on('get_users', Handlers.getUserList)
clientServer.on('get_reports', Handlers.getReports)
clientServer.on('get_match', Handlers.getMatchs)

/* Handlers for all users */
clientServer.on('get_statistic', Handlers.getStatistic)

/* Match hanlers */
clientServer.on('create_match', Handlers.createMatch)
clientServer.on('find_match', Handlers.findMatch)
clientServer.on('sync_lobby', Handlers.syncLobby)
clientServer.on('add_member', Handlers.addMember)
clientServer.on('remove_member', Handlers.removeMember)

app.listen(Number(process.env.PORT), (ls) => {
  if (ls) console.log(`listening websockets on ${process.env.PORT}`)
})
