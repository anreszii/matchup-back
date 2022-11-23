import { Collection, Guild, GuildMember } from 'discord.js'
import { DISCORD_ROBOT } from '../../app'
import { StateManager } from '../../Classes/Discord/StateManager'
import { guardCommandVoice } from './commandVoiceChatGuard'
import { distribute } from './distributor'

DISCORD_ROBOT.client.on('ready', (client) => console.log('discord bot ready'))

DISCORD_ROBOT.client.on('voiceStateUpdate', async (oldState, newState) => {
  if (!newState.channel) return
  let state = new StateManager(newState, DISCORD_ROBOT)
  let guild = await DISCORD_ROBOT.guildWithFreeChannelsForVoice
  if (!guild) {
    state.channel = null
    return
  }
  if (state.isDistributor) distribute(state, guild)
  if (state.isCommandVoice) guardCommandVoice(state)
})
