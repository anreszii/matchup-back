import {
  MODELS_ACTIONS,
  MODELS_ACTION_LIST,
} from '../../configs/Models/actions'
import { MODELS_ROLES } from '../../configs/Models/roles'
import { TechnicalCause, TechnicalError } from '../../error'
import type { USER_ROLE } from '../../Interfaces/index'
import { UserModel } from '../../Models/index'
import { Manager } from './Manager'

export class ModelsManager extends Manager<USER_ROLE, MODELS_ACTION_LIST> {
  _roles = MODELS_ROLES
  _actions = MODELS_ACTIONS

  constructor() {
    super()
    this._validateRoles()
    this._validateActions()
  }

  protected async _getAccessLevel(name: string): Promise<number> {
    let user = await UserModel.findByName(name)
    if (!user) return -1

    return this._roles.get(user.role)!
  }

  getRequiredAccessLevel(action: MODELS_ACTION_LIST): number {
    return this._getAccessLevelForAction(action)
  }
}
