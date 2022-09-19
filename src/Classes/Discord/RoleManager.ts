import type { Guild } from 'discord.js'
import type { Match } from '../../Interfaces/index'

type PlayerCommand = Exclude<Match.Member.command, 'spectator' | 'neutral'>

export class DiscordRoleManager {
  public static async createTeamRole(guild: Guild, id: string) {
    return guild.roles.create({
      name: `team#${id}`,
    })
  }

  public static async deleteTeamRole(guild: Guild, id: string) {
    let role = await this.findRoleByName(guild, `team#${id}`)
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
}
