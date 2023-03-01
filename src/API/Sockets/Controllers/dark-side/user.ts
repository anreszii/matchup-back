import { WebSocket } from 'uWebSockets.js'
import { CONTROLLERS } from '../..'
import { PLAYERS } from '../../../../Classes/MatchMaking/Player/Manager'
import { TechnicalCause, TechnicalError } from '../../../../error'

export async function is_online(socket: WebSocket, params: unknown[]) {
  let names = params[0]
  if (typeof names == 'string') names = [names]
  if (!(names instanceof Array))
    throw new TechnicalError('names', TechnicalCause.INVALID_FORMAT)

  const result = PLAYERS.isOnline(names)
  return Object.fromEntries(result)
}
CONTROLLERS.set('is_online', is_online)

export async function notify(socket: WebSocket, params: unknown[]) {
  const name = socket.username as string
  let ms: number = 0

  if (typeof params[0] == 'number' && params[0] >= 0) ms = params[0]
  setTimeout(() => {
    PLAYERS.get(name)?.notify('test notification')
  }, ms)
  return true
}
CONTROLLERS.set('notify', notify)
