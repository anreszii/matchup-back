import type { VoiceState, VoiceChannel } from 'discord.js'
import type { DiscordClient } from './Client'
import type { Match } from '../../Interfaces/index'

type PlayerCommand = Exclude<Match.Member.command, 'spectator' | 'neutral'>

export class StateManager {
  constructor(public state: VoiceState, private _client: DiscordClient) {}

  public get memberTeamID() {
    let role = this.state.member?.roles.cache.find((role) => {
      if (!role.name.startsWith('mm_team')) return false
      return true
    })

    if (!role) return
    return role.name.slice('mm_team'.length)
  }

  public getRole(roleName: string) {
    return this.state.member?.roles.cache.find((role) => {
      if (role.name != roleName) return false
      return true
    })
  }

  public get memberCommand() {
    if (this.getRole('mm_command1')) return 'command1'
    if (this.getRole('mm_command2')) return 'command2'
    return
  }

  public get channelCommand() {
    if (this.state.channel?.name.includes('mm_command1')) return 'command1'
    if (this.state.channel?.name.includes('mm_command2')) return 'command2'
    return
  }

  public get channelName() {
    return this.state.channel?.name
  }

  public get isCommandVoice() {
    if (
      !this.channelName?.startsWith('mm_command') ||
      !this.state.channel?.isVoiceBased
    )
      return false
    return true
  }

  public get isDistributor() {
    if (this.channelName != 'Распределитель') return false
    return true
  }

  public set channel(
    options: {
      name: string
      teamID: string
      command: PlayerCommand
    } | null,
  ) {
    if (!options) {
      this.state.setChannel(null)
      return
    }

    this._client
      .findChannelForMatch(options.name, options.teamID, options.command)
      .then((channel) => {
        if (!channel) return
        this.state.setChannel(channel as unknown as VoiceChannel)
      })
  }
}
