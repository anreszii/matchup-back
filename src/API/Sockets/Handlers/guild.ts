import type { IDataEscort } from 'gamesocket.io'
import type { Chat } from '../../../Interfaces'

import { clientServer } from '../clientSocketServer'
import { WS_SERVER } from '../../../app'
import { MatchUpError, validationCause, ValidationError } from '../../../error'

import { WebSocketValidatior } from '../../../validation'
import { UserModel, GuildModel } from '../../../Models/index'
import { ChatManager } from '../../../Classes/index'

const chats = new ChatManager()
let wsValidator = new WebSocketValidatior(WS_SERVER)

/**
 * Событие для вступления в гильдию </br>
 * Используемый пакет:
 *
 * ```ts
 * {
 *    guildName: string
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

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

    let guildName = escort.get('guildName')
    if (!guildName || typeof guildName != 'string')
      throw new ValidationError('guild name', validationCause.INVALID_FORMAT)

    let guild = await GuildModel.findByName(guildName)

    if (!guild) throw new ValidationError('guild', validationCause.NOT_EXIST)
    if (guild.isPrivate) throw new Error('guild is private')
    if (guild.memberList.length >= 50) throw new Error('Max member count')

    let chat = findGuildChat(guild.info.name)
    if (!chat) chat = createGuildChat(guild.info.name)
    chat.addMember({ name: username, role: 'user' })

    await guild.join(username)
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

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

    let guild = await GuildModel.findById(user.guild)
    if (!guild)
      return clientServer
        .control(clientServer.Aliases.get(username)!)
        .emit('leave_guild', { status: true })

    chat = chats.get(guild.info.name)
    if (chat) chat.deleteMember({ name: username, role: 'user' })

    if (await guild.leave(username))
      clientServer
        .control(clientServer.Aliases.get(username)!)
        .emit('leave_guild', { status: true })
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

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

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

    guild = await GuildModel.new(guildTag, guildName, username)

    let chat = createGuildChat(guildName)
    chat.addMember({ name: username, role: 'user' })
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

/**
 * Событие для смены названия гильдии. </br>
 * Используемый пакет:
 *
 * ```json
 * {
 *    "newGuildName": "unique guild name"
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *    "newGuidldName": "guild name"
 * }
 * ```
 * @category Guild
 * @event
 */
export async function change_guild_name(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string

    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)
    if (!user.guild)
      throw new ValidationError('user guild', validationCause.REQUIRED)

    let guildName = escort.get('newGuildName')
    if (!guildName || typeof guildName != 'string')
      throw new ValidationError('guild name', validationCause.INVALID_FORMAT)

    let guild = await GuildModel.findById(user.guild)
    if (!guild) {
      user.guild = undefined
      await user.save()
      throw new ValidationError('guild', validationCause.NOT_EXIST)
    }

    await guild.changeGuildName(username, guildName)
    clientServer
      .control(socketID)
      .emit('change_guild_name', { newGuildName: guildName })
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
clientServer.on('change_guild_name', change_guild_name)

/**
 * Событие для смены тэга гильдии. </br>
 * Используемый пакет:
 *
 * ```json
 * {
 *    "newGuildTag": "UGT"
 * }
 * ```
 *
 * В случае успеха создает одноименный ивент и отправляет на него JSON объект:
 * ```json
 * {
 *    "newGuildTag": "UGT"
 * }
 * ```
 * @category Guild
 * @event
 */
export async function change_guild_tag(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string

    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)
    if (!user.guild)
      throw new ValidationError('user guild', validationCause.REQUIRED)

    let guildTag = escort.get('newGuildTag')
    if (!guildTag || typeof guildTag != 'string')
      throw new ValidationError('guild tag', validationCause.INVALID_FORMAT)

    let guild = await GuildModel.findById(user.guild)
    if (!guild) {
      user.guild = undefined
      await user.save()
      throw new ValidationError('guild', validationCause.NOT_EXIST)
    }

    await guild.changeTagName(username, guildTag)
    clientServer
      .control(socketID)
      .emit('change_guild_tag', { newGuildTag: guildTag })
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
clientServer.on('change_guild_tag', change_guild_tag)

/**
 * Событие для просмотра гильдии, в которой состоит пользователь </br>
 * Используемый пакет:
 *
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
export async function check_guild(escort: IDataEscort) {
  try {
    let socketID = escort.get('socket_id') as string
    wsValidator.validateSocket(socketID)

    let socket = WS_SERVER.sockets.get(socketID)!
    let username = socket.username as string
    let user = await UserModel.findByName(username)
    if (!user) throw new ValidationError('user', validationCause.INVALID)

    if (!user.guild)
      throw new ValidationError('guild', validationCause.REQUIRED)
    let guild = await GuildModel.findById(user.guild)
    if (!guild) throw new ValidationError('guild', validationCause.NOT_EXIST)

    clientServer.control(socketID).emit('check_guild', JSON.stringify(guild))
  } catch (e) {
    let socketID = escort.get('socket_id') as string
    if (e instanceof MatchUpError) {
      if (e.genericMessage)
        return clientServer
          .control(socketID)
          .emit('check_guild error', { reason: e.genericMessage })
    } else if (e instanceof Error) {
      return clientServer
        .control(socketID)
        .emit('check_guild error', { reason: e.message })
    } else {
      clientServer
        .control(escort.get('socket_id') as string)
        .emit('check_guild error', { reason: 'unknown error' })
    }
  }
}
clientServer.on('check_guild', create_guild)

function findGuildChat(guildName: string) {
  return chats.get(guildName)
}

function createGuildChat(guildName: string) {
  return chats.spawn('gamesocket.io', `guild#${guildName}`, {
    namespace: 'client',
    room: `guild#${guildName}`,
  })
}
