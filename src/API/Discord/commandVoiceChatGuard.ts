import type { StateManager } from '../../Classes/Discord/StateManager'

export function guardCommandVoice(manager: StateManager) {
  let channelCommand = manager.channelCommand
  let memberCommand = manager.memberCommand
  if (!memberCommand) {
    manager.channel = null
    return
  }

  if (channelCommand != memberCommand) {
    manager.channel = null
    return
  }
}
