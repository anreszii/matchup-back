import type { StateManager } from '../../Classes/Discord/StateManager'
import type { Guild } from 'discord.js'

import { Logger } from '../../Utils/Logger'
const logger = new Logger('Discord', 'Distributor')

export function distribute(manager: StateManager, guild: Guild) {
  logger.trace(
    `DISTRIBUTING. MANAGER: ${JSON.stringify(
      manager.channelName,
    )}, GUILD: ${JSON.stringify(guild.name)}`,
  )
  let memberCommand = manager.memberCommand
  if (!memberCommand) return (manager.channel = null)

  let teamID = manager.memberTeamID
  if (!teamID) return (manager.channel = null)

  manager.channel = guild
}
