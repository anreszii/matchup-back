require('dotenv').config()
import { VoiceState } from 'discord.js'
import { guardCommandVoice } from './API/Discord/commandVoiceChatGuard'
import { distribute } from './API/Discord/distributor'
import { DiscordClient } from './Classes/Discord'
import { StateManager } from './Classes/Discord/StateManager'

export function init(token: string) {
  let dsClient = new DiscordClient(token)
  dsClient.client.on(
    'voiceStateUpdate',
    async (_: unknown, newState: VoiceState) => {
      if (newState.channel) {
        let manager = new StateManager(newState, dsClient)
        if (manager.isDistributor) return distribute(manager)
        if (manager.isCommandVoice) return guardCommandVoice(manager)
      }
    },
  )
}
