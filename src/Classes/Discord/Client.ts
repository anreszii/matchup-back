import {
  Client,
  Collection,
  GatewayIntentBits,
  Guild,
  OAuth2Guild,
} from 'discord.js'
import type { Match } from '../../Interfaces/index'
import { DiscordChannelManager } from './ChannelManager'
import { DiscordRoleManager } from './RoleManager'

type PlayerCommand = Exclude<Match.Member.command, 'spectator' | 'neutral'>

export class DiscordClient {
  public client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  })
  private _guilds!: Collection<string, OAuth2Guild>
  constructor(token: string) {
    this.client.login(token).then(async () => {
      this._guilds = await this.client.guilds.fetch()
    })
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
    console.log(voiceChannels)
    return voiceChannels
  }

  public async findChannelForMatch(
    guildName: string,
    teamID: string,
    command: PlayerCommand,
  ) {
    let guild = await this.getGuildByName(guildName)
    if (!guild) return
    return DiscordChannelManager.findChannel(guild, teamID, command)
  }

  public async addRoleToMember(
    guildName: string,
    nick: string,
    ...roles: string[]
  ) {
    let guild = await this.getGuildByName(guildName)
    if (!guild) return

    let user = await this.getMemberByNickanme(guildName, nick)
    if (!user) return

    for (let roleName of roles) {
      let role = await DiscordRoleManager.findRoleByName(guild, roleName)
      if (!role) continue
      user.roles.add(role)
    }
  }

  public async getMemberByNickanme(guildName: string, nick: string) {
    return this._getMembersFromGuild(guildName).then((members) => {
      return members?.find((member) => {
        if (member.nickname != nick) return false
        return true
      })
    })
  }

  public async getMemberById(guildName: string, id: string) {
    return this._getMembersFromGuild(guildName).then((members) => {
      if (members?.has(id)) return members.get(id)!
    })
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

  private async _getMembersFromGuild(guildName: string) {
    await this._updateGuilds()
    let guild = await this.getGuildByName(guildName)
    if (!guild) return

    return guild.members.fetch()
  }

  private async _updateGuilds() {
    return this.client.guilds.fetch().then((guilds) => {
      this._guilds = guilds
      return guilds
    })
  }
}
