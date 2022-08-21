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

let app = io()

let clientServer = app.of('client')

/* Basic handlers for user authorization */
clientServer.on('authorize', Handlers.authorize)
clientServer.on('change_role', Handlers.change_role)

/* Handlers for admins only */
clientServer.on('get_users', Handlers.get_users)
clientServer.on('get_reports', Handlers.get_reports)
clientServer.on('get_matchs', Handlers.get_matchs)

/* Handlers for all users */
clientServer.on('get_statistic', Handlers.get_statistic)

/* Match hanlers */
clientServer.on('create_match', Handlers.create_match)
clientServer.on('find_match', Handlers.find_match)
clientServer.on('sync_lobby', Handlers.sync_lobby)
clientServer.on('add_member', Handlers.add_member)
clientServer.on('remove_member', Handlers.remove_member)
export { app }
