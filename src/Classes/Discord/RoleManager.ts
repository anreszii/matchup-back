import type { Guild } from 'discord.js'
import type { Match } from '../../Interfaces/index'

type PlayerCommand = Exclude<
  Match.Lobby.Command.Types,
  'spectators' | 'neutrals'
>

export class DiscordRoleManager {
  public static async createTeamRole(guild: Guild, id: string) {
    return guild.roles.create({
      name: `mm_team#${id}`,
    })
  }

  public static async deleteTeamRole(guild: Guild, id: string) {
    let role = await this.findRoleByName(guild, `mm_team#${id}`)
    if (!role) return

    return role.delete()
  }

  public static async findRoleByName(guild: Guild, name: string) {
    return guild.roles.fetch().then((roles) => {
      return roles.find((role) => {
        if (role.name != name) return false
        return true
      })
    })
  }

  public static async findRoleByTeamId(guild: Guild, id: string) {
    return guild.roles.fetch().then((roles) => {
      return roles.find((role) => {
        if (role.name != `mm_team#${id}`) return false
        return true
      })
    })
  }
}
