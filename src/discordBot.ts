require('dotenv').config()
import type { Collection, Guild, GuildMember } from 'discord.js'
import { VoiceState } from 'discord.js'
import { guardCommandVoice } from './API/Discord/commandVoiceChatGuard'
import { distribute } from './API/Discord/distributor'
import { DiscordClient } from './Classes/Discord'
import { StateManager } from './Classes/Discord/StateManager'

export function init(token: string) {
  let dsClient = new DiscordClient(token)
  setInterval(function () {
    dsClient.guilds.then(async (guilds) => {
      for (let [_, guild] of guilds) {
        markChannelsForDelete(await guild.fetch())
      }
    })
  }, 1000 * 60 * 15)

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

function markChannelsForDelete(guild: Guild) {
  for (let [id, channel] of guild.channels.cache) {
    if (!channel.name.startsWith('command') || !channel.isVoiceBased) continue
    let members = channel.members as Collection<string, GuildMember>
    let func = checkChannelForDelete.bind({
      guild: guild,
      id: id,
    })
    if (members.size < 1) setTimeout(func, 1000 * 60 * 5)
  }
}

function checkChannelForDelete(this: { guild: Guild; id: string }) {
  if (!this.guild.channels.cache.has(this.id)) return
  this.guild.channels.cache
    .get(this.id)!
    .fetch()
    .then(async (channel) => {
      let members = channel.members as Collection<string, GuildMember>
      if (members.size < 1) await channel.delete()
    })
}
