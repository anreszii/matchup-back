export type MODELS_ACTION_LIST =
  /* User Model */
  | 'User/checkLevel'
  | 'User/addRelation'
  | 'User/dropRelation'
  | 'User/getPrefixes'
  | 'User/addPrefix'
  | 'User/setPrefix'
  | 'User/generateTestData'
  | 'User/getTestData'
  | 'User/deleteTestData'
  | 'User/getFriends'
  | 'User/getSubscribers'
  | 'User/setPassword'
  | 'User/validatePassword'
  | 'User/setAvatar'
  | 'User/isPremium'
  | 'User/extendPremium'

  /* PREMIUM CONFIG */
  | 'PremiumPeriods/createPeriod'
  | 'PremiumPeriods/deletePeriod'
  | 'PremiumPeriods/changePrice'

  /* Notifications */
  | 'NotificationQueue/shift'
  | 'NotificationQueue/readOne'
  | 'NotificationQueue/readAll'
  | 'NotificationQueue/getUnreaded'
  | 'NotificationQueue/deleteNotify'
  | 'NotificationQueue/erase'

  /* TaskList Model */
  | 'TaskList/getDaily'
  | 'TaskList/getWeekly'
  | 'TaskList/getCompletedDailyTasksCount'
  | 'TaskList/getCompletedWeeklyTasksCount'
  | 'TaskList/collectRewardFromDaily'
  | 'TaskList/collectRewardFromWeekly'
  | 'TaskList/getForUser'

  /* Task Types Models */
  | 'StaticTask/createType'
  | 'DynamicTask/createType'
  | 'StaticTask/getType'
  | 'DynamicTask/getType'

  /* Guild Model */
  | 'Guild/createGuild'
  | 'Guild/deleteGuild'
  | 'Guild/join'
  | 'Guild/invite'
  | 'Guild/acceptRequest'
  | 'Guild/leave'
  | 'Guild/rejectRequest'
  | 'Guild/createRole'
  | 'Guild/changeRole'
  | 'Guild/deleteRole'
  | 'Guild/giveRole'
  | 'Guild/changeOwner'
  | 'Guild/changeName'
  | 'Guild/changeTag'
  | 'Guild/changeImage'
  | 'Guild/changeTerms'
  | 'Guild/generateTestData'
  | 'Guild/getTestData'
  | 'Guild/deleteTestData'
  | 'Guild/ban'
  | 'Guild/kick'
  | 'Guild/addToBlackList'

  /* Match List Model */
  | 'Match/log'
  | 'Match/addRecords'
  | 'Match/changeRecord'
  | 'Match/changeRecordName'
  | 'Match/setScreen'
  | 'Match/getLoggedNames'
  | 'Match/getParsedNames'
  | 'Match/generateTestData'
  | 'Match/getTestData'
  | 'Match/deleteTestData'

  /* Report List Model */
  | 'Report/log'
  | 'Report/addProof'
  | 'Report/generateTestData'
  | 'Report/getTestData'
  | 'Report/deleteTestData'

  /* Order List Model */
  | 'Order/createOrder'
  | 'Order/generateTestData'
  | 'Order/getTestData'
  | 'Order/deleteTestData'

/** @TODO разделить менеджеры на разные модели, чтобы можно было назначать для каждой модели свои роли(например для гильдии) */
export const MODELS_ACTIONS: Map<MODELS_ACTION_LIST, number> = new Map()
/* User Model Actions */
MODELS_ACTIONS.set('User/checkLevel', 0)

MODELS_ACTIONS.set('User/addRelation', 0)
MODELS_ACTIONS.set('User/dropRelation', 0)

MODELS_ACTIONS.set('User/getFriends', 0)
MODELS_ACTIONS.set('User/getSubscribers', 0)

MODELS_ACTIONS.set('User/setPassword', 0)
MODELS_ACTIONS.set('User/validatePassword', 0)

MODELS_ACTIONS.set('User/setAvatar', 0)
MODELS_ACTIONS.set('User/isPremium', 0)
MODELS_ACTIONS.set('User/extendPremium', 0)

MODELS_ACTIONS.set('User/getPrefixes', 2)
MODELS_ACTIONS.set('User/addPrefix', 2)
MODELS_ACTIONS.set('User/setPrefix', 2)

MODELS_ACTIONS.set('User/generateTestData', 2)
MODELS_ACTIONS.set('User/getTestData', 2)
MODELS_ACTIONS.set('User/deleteTestData', 2)

/* Notifications */
MODELS_ACTIONS.set('NotificationQueue/shift', 0)
MODELS_ACTIONS.set('NotificationQueue/readOne', 0)
MODELS_ACTIONS.set('NotificationQueue/readAll', 0)
MODELS_ACTIONS.set('NotificationQueue/getUnreaded', 0)
MODELS_ACTIONS.set('NotificationQueue/deleteNotify', 0)
MODELS_ACTIONS.set('NotificationQueue/erase', 0)

/* PREMIUM CONFIG */
MODELS_ACTIONS.set('PremiumPeriods/createPeriod', 2)
MODELS_ACTIONS.set('PremiumPeriods/changePrice', 2)

/* Task List Model Actions */
MODELS_ACTIONS.set('TaskList/getDaily', 0)
MODELS_ACTIONS.set('TaskList/getWeekly', 0)
MODELS_ACTIONS.set('TaskList/getCompletedDailyTasksCount', 0)
MODELS_ACTIONS.set('TaskList/getCompletedWeeklyTasksCount', 0)
MODELS_ACTIONS.set('TaskList/collectRewardFromDaily', 0)
MODELS_ACTIONS.set('TaskList/collectRewardFromWeekly', 0)
MODELS_ACTIONS.set('TaskList/getForUser', 0)

/* Guild Model Actions */
MODELS_ACTIONS.set('Guild/createGuild', 0)
MODELS_ACTIONS.set('Guild/deleteGuild', 0)
MODELS_ACTIONS.set('Guild/join', 0)
MODELS_ACTIONS.set('Guild/invite', 0)
MODELS_ACTIONS.set('Guild/acceptRequest', 0)
MODELS_ACTIONS.set('Guild/leave', 0)
MODELS_ACTIONS.set('Guild/rejectRequest', 0)
MODELS_ACTIONS.set('Guild/createRole', 0)
MODELS_ACTIONS.set('Guild/changeRole', 0)
MODELS_ACTIONS.set('Guild/deleteRole', 0)
MODELS_ACTIONS.set('Guild/giveRole', 0)
MODELS_ACTIONS.set('Guild/changeOwner', 0)
MODELS_ACTIONS.set('Guild/changeName', 0)
MODELS_ACTIONS.set('Guild/changeTag', 0)
MODELS_ACTIONS.set('Guild/changeImage', 0)
MODELS_ACTIONS.set('Guild/changeTerms', 0)
MODELS_ACTIONS.set('Guild/kick', 0)
MODELS_ACTIONS.set('Guild/ban', 0)
MODELS_ACTIONS.set('Guild/addToBlackList', 0)
MODELS_ACTIONS.set('Guild/generateTestData', 2)
MODELS_ACTIONS.set('Guild/getTestData', 2)
MODELS_ACTIONS.set('Guild/deleteTestData', 2)

/* Match List Model Actions */
MODELS_ACTIONS.set('Match/log', 2)
MODELS_ACTIONS.set('Match/addRecords', 2)
MODELS_ACTIONS.set('Match/changeRecord', 2)
MODELS_ACTIONS.set('Match/changeRecordName', 2)
MODELS_ACTIONS.set('Match/setScreen', 2)
MODELS_ACTIONS.set('Match/generateTestData', 2)
MODELS_ACTIONS.set('Match/getTestData', 2)
MODELS_ACTIONS.set('Match/deleteTestData', 2)
MODELS_ACTIONS.set('Match/getLoggedNames', 2)
MODELS_ACTIONS.set('Match/getParsedNames', 2)

/* Task Types Model Actions */
MODELS_ACTIONS.set('StaticTask/createType', 2)
MODELS_ACTIONS.set('DynamicTask/createType', 2)
MODELS_ACTIONS.set('StaticTask/getType', 2)
MODELS_ACTIONS.set('DynamicTask/getType', 2)

/* Report List Model Actions */
MODELS_ACTIONS.set('Report/log', 0)
MODELS_ACTIONS.set('Report/addProof', 0)
MODELS_ACTIONS.set('Report/generateTestData', 2)
MODELS_ACTIONS.set('Report/getTestData', 2)
MODELS_ACTIONS.set('Report/deleteTestData', 2)

/* Order List Model Actions */
MODELS_ACTIONS.set('Order/createOrder', 0)
MODELS_ACTIONS.set('Order/generateTestData', 2)
MODELS_ACTIONS.set('Order/getTestData', 2)
MODELS_ACTIONS.set('Order/deleteTestData', 2)

export const isValidModelAction = function isValidModelAction(
  this: Map<MODELS_ACTION_LIST, number>,
  action: string,
): action is MODELS_ACTION_LIST {
  if (!action.includes('/')) return false
  return MODELS_ACTIONS.has(action as MODELS_ACTION_LIST)
}.bind(MODELS_ACTIONS)
