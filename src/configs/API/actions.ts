export type API_ACTION_LIST =
  | 'find_lobby'
  | 'invite_to_lobby'
  | 'join_to_lobby'
  | 'sync_lobby'
  | 'get_lobby_players_count'
  | 'get_lobby_count'
  | 'get_ready'
  | 'vote'
  | 'get_maps'
  | 'change_command'
  | 'get_captain'
  | 'create_team'
  | 'join_team'
  | 'leave_team'
  | 'check_team'
  | 'get_teams'
  | 'chat'
  | 'add_relation'
  | 'drop_relation'

export const API_ACTIONS: Map<API_ACTION_LIST, number> = new Map()
API_ACTIONS.set('find_lobby', 0)
API_ACTIONS.set('invite_to_lobby', 0)
API_ACTIONS.set('vote', 0)
API_ACTIONS.set('join_to_lobby', 0)
API_ACTIONS.set('get_lobby_players_count', 0)
API_ACTIONS.set('get_lobby_count', 0)
API_ACTIONS.set('get_captain', 0)
API_ACTIONS.set('sync_lobby', 0)
API_ACTIONS.set('create_team', 0)
API_ACTIONS.set('join_team', 0)
API_ACTIONS.set('leave_team', 0)
API_ACTIONS.set('get_teams', 0)
API_ACTIONS.set('get_maps', 0)
API_ACTIONS.set('chat', 0)
API_ACTIONS.set('add_relation', 0)
API_ACTIONS.set('drop_relation', 0)

export function isValidAPIAction(action: string): action is API_ACTION_LIST {
  return API_ACTIONS.has(action as API_ACTION_LIST)
}
