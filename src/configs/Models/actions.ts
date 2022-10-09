export type MODELS_ACTION_LIST =
  | 'User/checkLevel'
  | 'User/addRelation'
  | 'User/dropRelation'
  | 'TaskList/getDaily'
  | 'TaskList/collectRewardFromDaily'
  | 'TaskList/getWeekly'
  | 'TaskList/collectRewardFromWeekly'
  | 'TaskList/findListByUser'
  | 'TaskList/findListByUserName'
  | 'Guild/join'
  | 'Guild/leave'
  | 'Guild/changeGuildName'
  | 'Guild/changeTagName'
  | 'MatchList/setScreen'
  | 'ReportList/addProof'

/** @TODO разделить менеджеры на разные модели, чтобы можно было назначать для каждой модели свои роли(например для гильдии) */
export const MODELS_ACTIONS: Map<MODELS_ACTION_LIST, number> = new Map()
MODELS_ACTIONS.set('User/checkLevel', 0)
MODELS_ACTIONS.set('User/addRelation', 0)
MODELS_ACTIONS.set('User/dropRelation', 0)
MODELS_ACTIONS.set('TaskList/collectRewardFromDaily', 0)
MODELS_ACTIONS.set('TaskList/collectRewardFromWeekly', 0)
MODELS_ACTIONS.set('TaskList/findListByUser', 0)
MODELS_ACTIONS.set('TaskList/findListByUserName', 0)
MODELS_ACTIONS.set('TaskList/getDaily', 0)
MODELS_ACTIONS.set('TaskList/getWeekly', 0)
MODELS_ACTIONS.set('Guild/changeGuildName', 0)
MODELS_ACTIONS.set('Guild/changeTagName', 0)
MODELS_ACTIONS.set('Guild/join', 0)
MODELS_ACTIONS.set('Guild/leave', 0)
MODELS_ACTIONS.set('MatchList/setScreen', 2)
MODELS_ACTIONS.set('ReportList/addProof', 0)

export function isValidModelAction(
  action: string,
): action is MODELS_ACTION_LIST {
  if (!action.includes('/')) return false
  return MODELS_ACTIONS.has(action as MODELS_ACTION_LIST)
}
