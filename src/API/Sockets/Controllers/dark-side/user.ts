import { WebSocket } from 'uWebSockets.js'
import { CONTROLLERS } from '../..'
import { PLAYERS } from '../../../../Classes/MatchMaking/Player/Manager'
import { TechnicalCause, TechnicalError } from '../../../../error'
import { LeaderboardModel } from '../../../../Models'

export async function is_online(socket: WebSocket, params: unknown[]) {
  let names = params[0]
  if (typeof names == 'string') names = [names]
  if (!(names instanceof Array))
    throw new TechnicalError('names', TechnicalCause.INVALID_FORMAT)

  const result = PLAYERS.isOnline(names)
  return Object.fromEntries(result)
}
CONTROLLERS.set('is_online', is_online)

export async function get_leaderboard_page(
  socket: WebSocket,
  params: unknown[],
) {
  const skip = params[0]
  const limit = params[1]

  if (!skip || !limit || typeof skip != 'number' || typeof limit != 'number')
    throw new TechnicalError('params', TechnicalCause.INVALID_FORMAT)

  const result = await LeaderboardModel.aggregate([
    { $match: { type: 'user' } },
    { $unwind: '$records' },
    { $skip: skip },
    { $limit: limit },
  ])

  return result
}
CONTROLLERS.set('get_leaderboard_page', get_leaderboard_page)
