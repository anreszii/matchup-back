import { USER_ROLE } from '../../Interfaces/index'

export const API_ROLES: Map<USER_ROLE, number> = new Map()
API_ROLES.set('default', 0)
API_ROLES.set('privileged', 1)
API_ROLES.set('admin', 2)
