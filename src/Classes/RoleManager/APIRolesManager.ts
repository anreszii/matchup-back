import type { USER_ROLE as ROLE_LIST } from '../../Interfaces/index'
import type { API_ACTION_LIST } from '../../configs/API/actions'

import { Manager } from './Manager'
import { API_ROLES } from '../../configs/API/roles'
import { API_ACTIONS } from '../../configs/API/actions'

import { UserModel } from '../../Models/index'
import { TechnicalCause, TechnicalError } from '../../error'

export class APIManager extends Manager<ROLE_LIST, API_ACTION_LIST> {
  _roles = API_ROLES
  _actions = API_ACTIONS
  constructor() {
    super()
    this._validateRoles()
    this._validateActions()
  }
  protected async _getAccessLevel(name: string) {
    let user = await UserModel.findByName(name)
    if (!user) return -1

    return this._roles.get(user.role)!
  }

  getRequiredAccessLevel(action: API_ACTION_LIST): number {
    return this._getAccessLevelForAction(action)
  }
}
