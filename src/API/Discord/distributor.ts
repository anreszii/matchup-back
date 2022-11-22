import { Guild } from 'discord.js'
import type { StateManager } from '../../Classes/Discord/StateManager'
import type { Match } from '../../Interfaces/index'

type PlayerCommand = Exclude<
  Match.Lobby.Command.Types,
  'spectators' | 'neutrals'
>

export function distribute(manager: StateManager, guild: Guild | string) {
  let memberCommand = manager.memberCommand
  if (!memberCommand) return

  let teamID = manager.memberTeamID
  if (!teamID) return

  manager.channel = guild
}
