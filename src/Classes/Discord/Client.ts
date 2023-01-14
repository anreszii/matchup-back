import {
  Client,
  Collection,
  GatewayIntentBits,
  Guild,
  OAuth2Guild,
  Role,
} from 'discord.js'
import { distribute } from '../../API/Discord/distributor'
import type { Match } from '../../Interfaces/index'
import { DiscordChannelManager } from './ChannelManager'
import { DiscordRoleManager } from './RoleManager'
import { StateManager } from './StateManager'

type PlayerCommand = Exclude<
  Match.Lobby.Command.Types,
  'spectators' | 'neutrals'
>

export class DiscordClient {
  public client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
  })
  private _guilds!: Collection<string, OAuth2Guild>
  constructor(token: string) {
    this.client
      .login(token)
      .then(async () => {
        this._guilds = await this.client.guilds.fetch()
      })
      .catch((e) => console.error(e))
  }
  public async createChannelsForMatch(guild: string | Guild, teamID: string) {
    let voiceChannels = new Array()
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }

    voiceChannels.push(
      await DiscordChannelManager.createChannelForTeam(
        guild,
        teamID,
        'command1',
      ),
    )
    voiceChannels.push(
      await DiscordChannelManager.createChannelForTeam(
        guild,
        teamID,
        'command2',
      ),
    )
    return voiceChannels
  }

  public async findChannelForMatch(
    guild: string | Guild,
    teamID: string,
    command: PlayerCommand,
  ) {
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }
    return DiscordChannelManager.findChannel(guild, teamID, command)
  }

  public async findGuildWithCustomTeamIdRole(teamID: string) {
    let guilds = await this._updateGuilds()

    for (let [_, guild] of guilds) {
      let fetchedGuild = await guild.fetch()
      let role = await DiscordRoleManager.findRoleByTeamId(fetchedGuild, teamID)
      if (role) return fetchedGuild
    }
  }

  public async addRolesToMember(
    guild: string | Guild,
    nick: string,
    ...roles: string[] | Role[]
  ) {
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }

    let user = await this.getMemberByNickanme(guild, nick)
    if (!user) return

    for (let role of roles) {
      if (typeof role == 'string') {
        let tmp = await DiscordRoleManager.findRoleByName(guild, role)
        if (!tmp) return

        role = tmp
      }
      if (!role) continue
      user.roles.add(role)
    }
  }

  public async removeRolesFromMember(
    guild: string | Guild,
    nick: string,
    ...roles: string[] | Role[]
  ) {
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }

    let user = await this.getMemberByNickanme(guild, nick)
    if (!user) return

    for (let role of roles) {
      if (typeof role == 'string') {
        let tmp = await DiscordRoleManager.findRoleByName(guild, role)
        if (!tmp) return

        role = tmp
      }
      if (!role) continue
      user.roles.remove(role)
      if (role.members.size == 0) await role.delete()
    }
  }

  public async removeUserFromMatchMaking(guild: string | Guild, nick: string) {
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }

    let user = await this.getMemberByNickanme(guild, nick)
    if (!user) return

    let promises = []
    for (let [_, role] of user.roles.cache)
      if (role.name.startsWith('mm_')) promises.push(user.roles.remove(role))

    await Promise.all(promises)
    user.voice.setChannel(null)
  }

  async removeLobby(guild: Guild, id: string) {
    return guild.fetch().then((guild) => {
      DiscordRoleManager.deleteTeamRole(guild, id)
      for (let [_, channel] of guild.channels.cache) {
        if (
          channel.name == `command1#${id}` ||
          channel.name == `command2#${id}`
        )
          channel.delete()
      }
    })
  }

  public async addUserToTeamVoiceChannel(nick: string) {
    let result = await this._findUserByNicknameForMatchMaking(nick)
    if (!result || !result.user.voice || !result.user.voice.channelId) return

    distribute(new StateManager(result.user.voice, this), result.guild)
  }

  public async changeCommandRoleOfMember(
    guild: string | Guild,
    nick: string,
    command: PlayerCommand,
  ) {
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }

    let user = await this.getMemberByNickanme(guild, nick)
    if (!user) return

    let role = await DiscordRoleManager.findRoleByName(guild, command)
    if (!role) return

    let tmpCommand = command.includes('1') ? 'command2' : 'command1'

    if (user.roles.cache.has(role.id)) return
    this.removeRolesFromMember(guild, nick, tmpCommand)
    user.roles.add(role)
  }

  public async getMemberByNickanme(guild: string | Guild, nick: string) {
    let members = await this._getMembersFromGuild(guild)
    return members?.find((member) => {
      if (member.nickname != nick) return false
      return true
    })
  }

  public async getMemberById(guildName: string, id: string) {
    let members = await this._getMembersFromGuild(guildName)
    if (members?.has(id)) return members.get(id)!
  }

  public async getGuildByName(name: string) {
    await this._updateGuilds()

    let guild = this._guilds.find((guild) => {
      if (guild.name != name) return false
      return true
    })

    return guild?.fetch()
  }

  public get guilds() {
    return this._updateGuilds()
  }

  public get guildWithFreeChannelsForVoice() {
    return this._updateGuilds().then(async (guilds) => {
      for (let [_, guild] of guilds) {
        let tmp = await guild.fetch().then((fetchedGuild) => {
          if (fetchedGuild.channels.channelCountWithoutThreads <= 498)
            return fetchedGuild
        })

        if (tmp) return tmp
      }
    })
  }

  private async _getMembersFromGuild(guild: string | Guild) {
    if (typeof guild == 'string') {
      await this._updateGuilds()
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }

    return guild.members.fetch()
  }

  private async _updateGuilds() {
    return this.client.guilds.fetch().then((guilds) => {
      this._guilds = guilds
      return guilds
    })
  }

  private async _findUserByNicknameForMatchMaking(nick: string) {
    for (let [_, guild] of this._guilds) {
      let fetchedGuild = await guild.fetch()
      let user = await this.getMemberByNickanme(fetchedGuild, nick)
      if (
        user &&
        user.roles.cache.find((role) => {
          if (role.name.includes('mm_')) return true
          return false
        })
      ) {
        return { guild: fetchedGuild, user }
      }
    }
  }
}
