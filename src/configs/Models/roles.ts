import { USER_ROLE } from '../../Interfaces/index'

export const MODELS_ROLES: Map<USER_ROLE, number> = new Map()
MODELS_ROLES.set('default', 0)
MODELS_ROLES.set('admin', 2)
