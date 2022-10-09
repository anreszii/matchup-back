export namespace RoleManager {
  interface Instance {
    /** @returns true, если операция для данного пользователя доступна и false  в противном случае*/
    hasAccess(name: string, action: string): boolean | Promise<boolean>

    /**@returns уровень доступа, требуемый для выполнения действия, или -1 в случае, если такого действия не существует*/
    getRequiredAccessLevel(action: string): number | Promise<number>
  }
}
