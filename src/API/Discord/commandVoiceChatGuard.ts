import type { StateManager } from '../../Classes/Discord/StateManager'
import { Logger } from '../../Utils/Logger'
const logger = new Logger('Discord', 'Voice Guard')

export function guardCommandVoice(manager: StateManager) {
  logger.trace(`PROTECTING. MANAGER: ${manager.channelName}`)
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
