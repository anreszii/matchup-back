import type { IDataEscort } from 'gamesocket.io'
import type { Chat } from '../../../Interfaces'

import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import { MatchUpError, validationCause, ValidationError } from '../../../error'

import { WebSocketValidatior } from '../../../validation'
import { UserModel, GuildModel } from '../../../Models/index'
import { ChatManager } from '../../../Classes/index'

export let GuildChatManager = new ChatManager(true)
let wsValidator = new WebSocketValidatior(WS_SERVER)

/**
 * Событие для вступления в гильдию </br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *    guildName: string
 *    userName: string
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *    guildName: string
 * }
 * ```
 * @category Guild
 * @event
 */
export async function join_guild(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let guildName = escort.get('guildName')
    if (!guildName || typeof guildName != 'string')
      throw new ValidationError('guild name', validationCause.INVALID_FORMAT)

    let guild = await GuildModel.findByName(guildName)

    if (!guild) throw new ValidationError('guild', validationCause.NOT_EXIST)
    if (guild.isPrivate) throw new Error('guild is private')
    if (guild.memberList.length >= 50) throw new Error('Max member count')

    let userName = escort.get('userName')
    if (!userName || typeof userName != 'string')
      throw new ValidationError('guild name', validationCause.INVALID_FORMAT)

    let user = await UserModel.findByName(userName)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)

    let chat = findGuildChat(guild.info.name)
    if (!chat) chat = createGuildChat(guild.info.name)
    chat.addMember({ name: userName, role: 'user' })

    await guild.join(userName)
    clientServer.control(socketID).emit('join_guild', { guildName })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('join_guild error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('join_guild error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('join_guild error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('join_guild', join_guild)

/**
 * Событие для выхода из гильдии </br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *    guildName: string
 *    userName: string
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *    status: true
 * }
 * ```
 * @category Guild
 * @event
 */
export async function leave_guild(escort: IDataEscort) {
  try {
    let chat: Chat.Instance | undefined
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let guildName = escort.get('guildName')
    if (!guildName || typeof guildName != 'string')
      throw new ValidationError('guild name', validationCause.INVALID_FORMAT)

    let guild = await GuildModel.findByName(guildName)
    if (!guild) throw new ValidationError('guild', validationCause.NOT_EXIST)

    let userName = escort.get('userName')
    if (!userName || typeof userName != 'string')
      throw new ValidationError('guild name', validationCause.INVALID_FORMAT)

    let user = await UserModel.findByName(userName)
    if (!user) throw new ValidationError('user', validationCause.NOT_EXIST)

    chat = GuildChatManager.get(guild.info.name)
    if (chat) chat.deleteMember({ name: userName, role: 'user' })

    if (await guild.leave(userName))
      clientServer.control(socketID).emit('leave_guild', { status: true })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('join_guild error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('join_guild error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('join_guild error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('leave_guild', leave_guild)

/**
 * Событие для выхода из гильдии </br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *    guildName: string
 *    guildTag: string
 *    userName: string
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```ts
 * {
 *    status: true
 * }
 * ```
 * @category Guild
 * @event
 */
export async function create_guild(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let guildName = escort.get('guildName')
    if (!guildName || typeof guildName != 'string')
      throw new ValidationError('guild name', validationCause.INVALID_FORMAT)

    let guild = await GuildModel.findByName(guildName)
    if (guild) throw new ValidationError('guild', validationCause.ALREADY_EXIST)

    let guildTag = escort.get('guildTag')
    if (!guildTag || typeof guildTag != 'string')
      throw new ValidationError('guild tag', validationCause.INVALID_FORMAT)

    guild = await GuildModel.findByTag(guildTag)
    if (guild) throw new ValidationError('guild', validationCause.ALREADY_EXIST)

    let userName = escort.get('userName')
    if (!userName || typeof userName != 'string')
      throw new ValidationError('user name', validationCause.INVALID_FORMAT)

    guild = await GuildModel.new(guildTag, guildName, userName)

    let chat = createGuildChat(guildName)
    chat.addMember({ name: userName, role: 'user' })
    clientServer.control(socketID).emit('create_guild', { status: true })
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('create_guild error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('create_guild error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('create_guild error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('create_guild', create_guild)

function findGuildChat(guildName: string) {
  return GuildChatManager.get(guildName)
}

function createGuildChat(guildName: string) {
  return GuildChatManager.spawn(
    'gamesocket.io',
    {
      namespace: 'client',
      room: `guild#${guildName}`,
    },
    guildName,
  )
}
