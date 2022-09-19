import type { Guild } from 'discord.js'
import type { Match } from '../../Interfaces/index'
import { ChannelType, PermissionsBitField } from 'discord.js'
import { DiscordRoleManager } from './RoleManager'

type PlayerCommand = Exclude<Match.Member.command, 'spectator' | 'neutral'>

export class DiscordChannelManager {
  public static async createChannelForTeam(
    guild: Guild,
    id: string,
    command: PlayerCommand,
  ) {
    let teamRole = await DiscordRoleManager.findRoleByName(guild, `team#${id}`)
    if (!teamRole) return

    return guild.channels.create({
      name: `${command}#${id}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [
        {
          id: teamRole.id,
          allow: [
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
        {
          id: guild.roles.everyone,
          deny: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
      ],
    })
  }

  public static async deleteChannelForTeam(
    guild: Guild,
    id: string,
    command: PlayerCommand,
  ) {
    let channel = await this.findChannel(guild, id, command)
    if (!channel) return

    return channel.delete()
  }

  public static async findChannel(
    guild: Guild,
    id: string,
    command: PlayerCommand,
  ) {
    return guild.channels.fetch().then((channels) => {
      return channels.find((channel) => {
        if (channel.name != `${command}#${id}`) return false
        return true
      })
    })
  }
}
