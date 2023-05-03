export type API_ACTION_LIST =
  /* LOBBY */
  | 'get_lobby_count'
  | 'get_global_players_count'
  | 'find_lobby'
  | 'join_to_lobby'
  | 'invite_to_lobby'
  | 'leave_lobby'
  | 'get_lobby_players_count'
  | 'get_ready'
  | 'get_maps'
  | 'get_captain'
  | 'get_owner'
  | 'get_game_id'
  | 'set_game_id'
  | 'vote'
  | 'sync_lobby'
  | 'change_command'
  | 'force_stop_lobby'
  /* TEAM */
  | 'create_team'
  | 'join_team'
  | 'leave_team'
  | 'check_team'
  | 'get_teams'
  | 'invite_to_team'
  /* CHAT */
  | 'chat_message'
  | 'chat_join'
  | 'chat_leave'
  | 'chat_load_history'
  /* USER */
  | 'is_online'
  | 'become_online'
  | 'become_offline'
  | 'notify'
  | 'get_leaderboard_page'

  /* TEST */
  | 'test/notify'
  | 'test/lobby_fullfill'
  | 'test/lobby_get_ready'
  | 'test/lobby_leave'
  | 'test/lobby_delete'

export const API_ACTIONS: Map<API_ACTION_LIST, number> = new Map()
API_ACTIONS.set('get_lobby_count', 0)
API_ACTIONS.set('get_global_players_count', 0)
API_ACTIONS.set('find_lobby', 0)
API_ACTIONS.set('join_to_lobby', 0)
API_ACTIONS.set('invite_to_lobby', 0)
API_ACTIONS.set('leave_lobby', 0)
API_ACTIONS.set('get_lobby_players_count', 0)
API_ACTIONS.set('get_ready', 0)
API_ACTIONS.set('get_maps', 0)
API_ACTIONS.set('get_captain', 0)
API_ACTIONS.set('get_owner', 0)
API_ACTIONS.set('get_game_id', 0)
API_ACTIONS.set('set_game_id', 0)
API_ACTIONS.set('force_stop_lobby', 0)
API_ACTIONS.set('vote', 0)
API_ACTIONS.set('sync_lobby', 0)
API_ACTIONS.set('create_team', 0)
API_ACTIONS.set('join_team', 0)
API_ACTIONS.set('leave_team', 0)
API_ACTIONS.set('check_team', 0)
API_ACTIONS.set('invite_to_team', 0)
API_ACTIONS.set('get_teams', 0)
API_ACTIONS.set('chat_message', 0)
API_ACTIONS.set('chat_join', 0)
API_ACTIONS.set('chat_leave', 0)
API_ACTIONS.set('chat_load_history', 0)
API_ACTIONS.set('is_online', 0)
API_ACTIONS.set('become_online', 0)
API_ACTIONS.set('become_offline', 0)
API_ACTIONS.set('notify', 0)
API_ACTIONS.set('get_leaderboard_page', 0)
API_ACTIONS.set('test/notify', 2)
API_ACTIONS.set('test/lobby_fullfill', 2)
API_ACTIONS.set('test/lobby_get_ready', 2)
API_ACTIONS.set('test/lobby_leave', 2)
API_ACTIONS.set('test/lobby_delete', 2)

export function isValidAPIAction(action: string): action is API_ACTION_LIST {
  return API_ACTIONS.has(action as API_ACTION_LIST)
}
