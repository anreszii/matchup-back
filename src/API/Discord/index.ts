import { Collection, Guild, GuildMember } from 'discord.js'
import { DiscordClient } from '../../Classes/Discord/Client'
import { StateManager } from '../../Classes/Discord/StateManager'
import { guardCommandVoice } from './commandVoiceChatGuard'
import { distribute } from './distributor'

let robot = new DiscordClient(process.env.DISCORD_BOT_TOKEN!)
robot.client.on('ready', (client) => console.log('discord bot ready'))
setInterval(async function () {
  let guilds = await robot.guilds
  for (let [_, guild] of guilds) markChannelsForDelete(await guild.fetch())
}, 1000 * 60 * 15)

robot.client.on('voiceStateUpdate', async (oldState, newState) => {
  if (!newState.channel) return
  let state = new StateManager(newState, robot)
  let guild = await robot.guildWithFreeChannelsForVoice
  if (!guild) {
    state.channel = null
    return
  }
  if (state.isDistributor) distribute(state, guild)
  if (state.isCommandVoice) guardCommandVoice(state)
})

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

async function checkChannelForDelete(this: { guild: Guild; id: string }) {
  if (!this.guild.channels.cache.has(this.id)) return
  let channel = await this.guild.channels.cache.get(this.id)!.fetch()

  let members = channel.members as Collection<string, GuildMember>
  if (members.size < 1) await channel.delete()
}
