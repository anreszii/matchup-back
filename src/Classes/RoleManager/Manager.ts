import { TechnicalCause, TechnicalError } from '../../error'
import { RoleManager } from '../../Interfaces/RoleManager/index'

export abstract class Manager<R extends string, A extends string>
  implements RoleManager.Instance
{
  /**Список ролей и их уровня доступа, должен быть установлен наследником*/
  protected _roles!: Map<R, number>
  /**Список требуемого уровня доступа для выполнения конкретного действия, должен быть установлен наследником*/
  protected _actions!: Map<A, number>
  /**Функция, которая будет использована в {@link hasAccess} для проверки доступа*/
  protected abstract _getAccessLevel(name: string): number | Promise<number>

  /** @returns true, если операция для данного пользователя доступна и false  в противном случае*/
  hasAccess(name: string, action: A) {
    let requiredAccessLevel = this._getAccessLevelForAction(action)
    if (!~requiredAccessLevel) return false
    let roleAccessLevel = this._getAccessLevel(name)

    if (!~roleAccessLevel) return false
    if (typeof roleAccessLevel == 'number')
      return roleAccessLevel >= requiredAccessLevel

    return roleAccessLevel.then((value) => {
      return value >= requiredAccessLevel
    })
  }

  /**@returns уровень доступа, требуемый для выполнения действия, или -1 в случае, если такого действия не существует*/
  abstract getRequiredAccessLevel(action: A): number

  protected _getAccessLevelForAction(action: A): number {
    if (!this._actions.has(action)) return -1
    return this._actions.get(action)!
  }

  /**Проверяет, есть ли в ролях повторяющиеся значения уровня доступа*/
  protected _validateRoles() {
    let tmp: Array<string> = []
    for (let [role, level] of this._roles) {
      if (tmp[level])
        throw new Error(
          `Access level ${level} has several binded roles: [${tmp[level]}, ${role}}]`,
        )

      tmp[level] = role
    }
  }

  /**Проверяет, есть ли в уровнях доступа отрицательные значения*/
  protected _validateActions() {
    for (let [action, level] of this._actions) {
      if (level < 0)
        throw new Error(`Access level for action ${action} is negative`)
    }
  }
}
