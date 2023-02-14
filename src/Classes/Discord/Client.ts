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
import { Command } from '../MatchMaking/Command/Command'
import { COMMANDS } from '../MatchMaking/Command/Manager'
import { StandOff_Lobbies } from '../../API/Sockets'
import { Logger } from '../../Utils/Logger'

type PlayerCommand = Exclude<
  Match.Lobby.Command.Types,
  'spectators' | 'neutrals'
>

export class DiscordClient {
  private _logger = new Logger('Discord', 'Client')
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
        this._logger.info('LOGGED IN')
        this._guilds = await this.client.guilds.fetch()
      })
      .catch((e) => this._logger.critical(e))
  }

  addUserToTeamVoiceChannel(nick: string) {
    this._logger.info(`${nick} CONNECTING TO VOICE`)
    let result = this._findUserByNicknameForMatchMaking(nick)
    if (!result) return
    return result
      .then((result) => {
        this._logger.trace(`USER DATA: ${JSON.stringify(result)}`)
        if (!result || !result.user.voice || !result.user.voice.channelId)
          return
        distribute(new StateManager(result.user.voice, this), result.guild)
      })
      .catch((e) => {
        this._logger.warning(e)
      })
  }

  findGuildWithCustomTeamIdRole(teamID: string) {
    this._logger.trace('SEARCHING FOR GUILD WITH ROLE')
    return this._updateGuilds().then(async (guilds) => {
      for (let [_, guild] of guilds) {
        let fetchedGuild = await guild.fetch()
        let role = await DiscordRoleManager.findRoleByTeamId(
          fetchedGuild,
          teamID,
        )
        this._logger.trace(`FETCHED GUILD: ${fetchedGuild}`)
        if (role) return fetchedGuild
      }
    })
  }

  removeLobby(guild: Guild, id: string) {
    this._logger.info('CLEANING LOBBY DATA')
    return guild
      .fetch()
      .then((guild) => {
        DiscordRoleManager.deleteTeamRole(guild, id).catch((e) => {
          this._logger.critical(e)
        })
        for (let [_, channel] of guild.channels.cache) {
          if (
            channel.name == `command1#${id}` ||
            channel.name == `command2#${id}`
          )
            channel.delete()
        }
      })
      .catch((e) => {
        this._logger.critical(e)
      })
  }

  getMemberByNickanme(guild: string | Guild, nick: string) {
    return this._getMembersFromGuild(guild).then((members) => {
      return members?.find((member) => {
        if (member.nickname) return member.nickname == nick
        else return member.user.username == nick
      })
    })
  }

  getMemberById(guildName: string, id: string) {
    return this._getMembersFromGuild(guildName)
      .then((members) => {
        if (members?.has(id)) return members.get(id)!
      })
      .catch((e) => {
        console.error(e)
      })
  }

  getGuildByName(name: string) {
    return this._updateGuilds().then((guilds) => {
      return guilds
        .find((guild) => {
          if (guild.name != name) return false
          return true
        })
        ?.fetch()
    })
  }

  async findChannelForMatch(
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

  async createChannelsForMatch(guild: string | Guild, teamID: string) {
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

  async addRolesToMember(
    guild: string | Guild,
    nick: string,
    ...roles: string[] | Role[]
  ) {
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }
    this._logger.info(`ADDING ROLES TO ${nick}`)

    let user = await this.getMemberByNickanme(guild, nick)
    if (!user) return

    for (let role of roles) {
      if (typeof role == 'string') {
        let tmp = await DiscordRoleManager.findRoleByName(guild, role)
        if (!tmp) return

        role = tmp
      }
      if (!role) continue
      user.roles
        .add(role)
        .then(() => {
          this._logger.trace(`ADDED ROLE ${role} to ${nick}`)
        })
        .catch((e) => {
          this._logger.warning(e)
        })
    }
  }

  async removeRolesFromMember(
    guild: string | Guild,
    nick: string,
    ...roles: string[] | Role[]
  ) {
    if (typeof guild == 'string') {
      let tmp = await this.getGuildByName(guild)
      if (!tmp) return

      guild = tmp
    }
    this._logger.info(`REMOVING ROLES TO ${nick}`)

    let user = await this.getMemberByNickanme(guild, nick)
    if (!user) return

    for (let role of roles) {
      if (typeof role == 'string') {
        let tmp = await DiscordRoleManager.findRoleByName(guild, role)
        if (!tmp) return

        role = tmp
      }
      if (!role) continue
      user.roles
        .remove(role)
        .then(() => {
          this._logger.trace(`REMOVED ROLE ${role} to ${nick}`)
        })
        .catch((e) => {
          this._logger.warning(e)
        })
      if (role.members.size == 0) await role.delete()
    }
  }

  async changeCommandRoleOfMember(
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

  async joinDiscordLobby(guild: Guild, member: Match.Player.Instance) {
    const parsedMemberData = parseLobbyAndCommandFromMember(member)
    if (!parsedMemberData) return false
    this._logger.info(`${member.name} JOINS DISCORD LOBBY`)
    let commandRole = await DiscordRoleManager.findRoleByName(
      guild,
      parsedMemberData.command,
    )
    if (!commandRole) return false

    let teamRole = await DiscordRoleManager.findRoleByTeamId(
      guild,
      parsedMemberData.id,
    )
    if (!teamRole)
      teamRole = await DiscordRoleManager.createTeamRole(
        guild,
        parsedMemberData.id,
      )

    this.addRolesToMember(guild, member.discordNick, teamRole, commandRole)
      .then(() => {
        this.addUserToTeamVoiceChannel(member.discordNick)?.catch((e) => {
          console.error(e)
          return
        })
      })
      .catch((e) => this._logger.warning(e))
    return true
  }

  async leaveDiscordLobby(guild: Guild, member: Match.Player.Instance) {
    return this.getMemberByNickanme(guild, member.discordNick).then((user) => {
      if (!user) return false

      this._logger.info(`${member.name} LEAVES DISCORD LOBBY`)
      let promises = []
      for (let [_, role] of user.roles.cache)
        if (role.name.startsWith('mm_')) promises.push(user.roles.remove(role))

      Promise.all(promises).then(() => {
        user.voice.setChannel(null)
      })

      return true
    })
  }

  get guilds() {
    return this._updateGuilds()
  }

  get guildWithFreeChannelsForVoice() {
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

  private _updateGuilds() {
    return this.client.guilds.fetch().then((guilds) => {
      this._guilds = guilds
      return guilds
    })
  }

  private _findUserByNicknameForMatchMaking(nick: string) {
    for (let [_, guild] of this._guilds)
      return guild.fetch().then((fetchedGuild) => {
        return this.getMemberByNickanme(fetchedGuild, nick).then((user) => {
          if (
            user &&
            user.roles.cache.find((role) => {
              if (role.name.includes('mm_')) return true
              return false
            })
          )
            return { guild: fetchedGuild, user }
        })
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
}

function parseLobbyAndCommandFromMember(member: Match.Player.Instance) {
  if (!member.commandID || !member.lobbyID) return null
  const command = COMMANDS.get(member.commandID)
  if (!command) return null
  let discordCommandRoleName: 'mm_command1' | 'mm_command2'
  switch (command.type) {
    case 'command1':
      discordCommandRoleName = 'mm_command1'
      break
    case 'command2':
      discordCommandRoleName = 'mm_command2'
      break
    default:
      return null
  }

  return {
    command: discordCommandRoleName,
    id: member.lobbyID,
  }
}
