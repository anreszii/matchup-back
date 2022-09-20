import type { StateManager } from '../../Classes/Discord/StateManager'
import type { Match } from '../../Interfaces/index'

type PlayerCommand = Exclude<Match.Member.command, 'spectator' | 'neutral'>

export function distribute(manager: StateManager) {
  let memberCommand = manager.memberCommand
  if (!memberCommand) return

  let teamID = manager.memberTeamID
  if (!teamID) return

  manager.channel = {
    name: 'Группа',
    teamID,
    command: memberCommand as PlayerCommand,
  }
}
