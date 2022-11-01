export type MODELS_ACTION_LIST =
  /* User Model */
  | 'User/checkLevel'
  | 'User/addRelation'
  | 'User/dropRelation'
  | 'User/getPrefixes'
  | 'User/setPrefix'
  | 'User/generateTestData'
  | 'User/getTestData'
  | 'User/deleteTestData'

  /* TaskList Model */
  | 'TaskList/getDaily'
  | 'TaskList/collectRewardFromDaily'
  | 'TaskList/getWeekly'
  | 'TaskList/collectRewardFromWeekly'
  | 'TaskList/getForUser'

  /* Task Types Models */
  | 'StaticTask/createType'
  | 'DynamicTask/createType'
  | 'StaticTask/getType'
  | 'DynamicTask/getType'

  /* Guild Model */
  | 'Guild/join'
  | 'Guild/leave'
  | 'Guild/changeGuildName'
  | 'Guild/generateTestData'
  | 'Guild/getTestData'
  | 'Guild/deleteTestData'
  | 'Guild/changeTagName'

  /* Match List Model */
  | 'MatchList/log'
  | 'MatchList/addRecords'
  | 'MatchList/changeRecord'
  | 'MatchList/setScreen'
  | 'MatchList/generateTestData'
  | 'MatchList/getTestData'
  | 'MatchList/deleteTestData'

  /* Report List Model */
  | 'ReportList/log'
  | 'ReportList/addProof'
  | 'ReportList/generateTestData'
  | 'ReportList/getTestData'
  | 'ReportList/deleteTestData'

  /* Order List Model */
  | 'OrderList/createOrder'
  | 'OrderList/generateTestData'
  | 'OrderList/getTestData'
  | 'OrderList/deleteTestData'

/** @TODO разделить менеджеры на разные модели, чтобы можно было назначать для каждой модели свои роли(например для гильдии) */
export const MODELS_ACTIONS: Map<MODELS_ACTION_LIST, number> = new Map()
/* User Model Actions */
MODELS_ACTIONS.set('User/checkLevel', 0)
MODELS_ACTIONS.set('User/addRelation', 0)
MODELS_ACTIONS.set('User/dropRelation', 0)
MODELS_ACTIONS.set('User/getPrefixes', 2)
MODELS_ACTIONS.set('User/setPrefix', 2)
MODELS_ACTIONS.set('User/generateTestData', 2)
MODELS_ACTIONS.set('User/getTestData', 2)
MODELS_ACTIONS.set('User/deleteTestData', 2)

/* Task List Model Actions */
MODELS_ACTIONS.set('TaskList/collectRewardFromDaily', 0)
MODELS_ACTIONS.set('TaskList/collectRewardFromWeekly', 0)
MODELS_ACTIONS.set('TaskList/getForUser', 0)
MODELS_ACTIONS.set('TaskList/getDaily', 0)
MODELS_ACTIONS.set('TaskList/getWeekly', 0)

/* Guild Model Actions */
MODELS_ACTIONS.set('Guild/changeGuildName', 0)
MODELS_ACTIONS.set('Guild/changeTagName', 0)
MODELS_ACTIONS.set('Guild/join', 0)
MODELS_ACTIONS.set('Guild/leave', 0)
MODELS_ACTIONS.set('Guild/generateTestData', 2)
MODELS_ACTIONS.set('Guild/getTestData', 2)
MODELS_ACTIONS.set('Guild/deleteTestData', 2)

/* Match List Model Actions */
MODELS_ACTIONS.set('MatchList/log', 2)
MODELS_ACTIONS.set('MatchList/addRecords', 2)
MODELS_ACTIONS.set('MatchList/changeRecord', 2)
MODELS_ACTIONS.set('MatchList/setScreen', 2)
MODELS_ACTIONS.set('MatchList/generateTestData', 2)
MODELS_ACTIONS.set('MatchList/getTestData', 2)
MODELS_ACTIONS.set('MatchList/deleteTestData', 2)

/* Task Types Model Actions */
MODELS_ACTIONS.set('StaticTask/createType', 2)
MODELS_ACTIONS.set('DynamicTask/createType', 2)
MODELS_ACTIONS.set('StaticTask/getType', 2)
MODELS_ACTIONS.set('DynamicTask/getType', 2)

/* Report List Model Actions */
MODELS_ACTIONS.set('ReportList/log', 0)
MODELS_ACTIONS.set('ReportList/addProof', 0)
MODELS_ACTIONS.set('ReportList/generateTestData', 2)
MODELS_ACTIONS.set('ReportList/getTestData', 2)
MODELS_ACTIONS.set('ReportList/deleteTestData', 2)

/* Order List Model Actions */
MODELS_ACTIONS.set('OrderList/createOrder', 0)
MODELS_ACTIONS.set('OrderList/generateTestData', 2)
MODELS_ACTIONS.set('OrderList/getTestData', 2)
MODELS_ACTIONS.set('OrderList/deleteTestData', 2)

export const isValidModelAction = function isValidModelAction(
  this: Map<MODELS_ACTION_LIST, number>,
  action: string,
): action is MODELS_ACTION_LIST {
  if (!action.includes('/')) return false
  return MODELS_ACTIONS.has(action as MODELS_ACTION_LIST)
}.bind(MODELS_ACTIONS)
