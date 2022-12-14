import type { Guild } from 'discord.js'
import type { Match } from '../../Interfaces/index'
import { ChannelType, PermissionsBitField } from 'discord.js'
import { DiscordRoleManager } from './RoleManager'

type PlayerCommand = Exclude<
  Match.Lobby.Command.Types,
  'spectators' | 'neutrals'
>

export class DiscordChannelManager {
  public static async createChannelForTeam(
    guild: Guild,
    id: string,
    command: PlayerCommand,
  ) {
    let teamRole = await DiscordRoleManager.findRoleByName(
      guild,
      `mm_team#${id}`,
    )
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
    let channels = await guild.channels.fetch()
    return channels.find((channel) => {
      if (!channel) return false
      if (channel.name != `${command}#${id}`) return false
      return true
    })
  }
}
