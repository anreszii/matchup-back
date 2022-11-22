import type { VoiceState, VoiceChannel, Guild } from 'discord.js'
import type { DiscordClient } from './Client'
import type { Match } from '../../Interfaces/index'

type PlayerCommand = Exclude<
  Match.Lobby.Command.Types,
  'spectators' | 'neutrals'
>

export class StateManager {
  constructor(public state: VoiceState, private _client: DiscordClient) {}

  getRole(roleName: string) {
    return this.state.member?.roles.cache.find((role) => {
      if (role.name != roleName) return false
      return true
    })
  }

  get memberTeamID() {
    let role = this.state.member?.roles.cache.find((role) => {
      if (!role.name.startsWith('mm_team')) return false
      return true
    })

    if (!role) return
    return role.name.slice('mm_team#'.length)
  }

  get memberCommand() {
    if (this.getRole('mm_command1')) return 'command1'
    if (this.getRole('mm_command2')) return 'command2'
    return
  }

  get channelCommand() {
    if (this.state.channel?.name.includes('command1')) return 'command1'
    if (this.state.channel?.name.includes('command2')) return 'command2'
    return
  }

  get channelName() {
    return this.state.channel?.name
  }

  get isCommandVoice() {
    if (
      !this.channelName?.startsWith('command') ||
      !this.state.channel?.isVoiceBased
    )
      return false
    return true
  }

  get isDistributor() {
    if (
      this.channelName == 'Распределитель' ||
      this.channelName == 'Distributor'
    )
      return true
    return false
  }

  get inChannel() {
    if (!this.state.channel || this.state.channel.name == 'Распределитель')
      return false
    return true
  }

  set channel(name: Guild | string | null) {
    let team = this.memberTeamID
    let command: 'command1' | 'command2' | undefined = this.memberCommand
    if (!name || !team || !command) {
      this.state.setChannel(null)
      return
    }

    this._client
      .findChannelForMatch(name, team, command)
      .then((channel) => {
        if (!channel) return this.state.setChannel(null)
        this.state.setChannel(channel as unknown as VoiceChannel)
      })
      .catch((e) => console.error(e))
  }
}
