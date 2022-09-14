import type { Chat } from '../../../Interfaces'

export class Factory implements Chat.Controller.Factory.Interface {
  /**
   * @param controllerName имя контроллера, указанное после -
   * @param options опции, необходимые для указанного контроллера. В случае, если их будет меньше, выбрасывает ошибку
   * @returns object {@link Chat.Controller Controller}
   *
   * Возможные контроллеры и options к ним:<br>
   * - gamesocket.io
   * ```ts
   * {
   *   namespace: string
   *   options: room
   * }
   * ```
   *
   */
  static create(
    controllerName: 'gamesocket.io',
    options?: { [key: string]: string },
  ) {
    let controller: Chat.Controller.Instance
    let optionCounter = 0
    switch (controllerName) {
      case 'gamesocket.io': {
        let GameSocketController = require('./GamesocketController')
        //считывает, сколько опций не хватило для корректной работы контроллера
        controller = new GameSocketController()
        if (options?.namespace) {
          controller.namespace = options.namespace
          optionCounter++
        }
        if (options?.room) {
          controller.roomName = options.room
          optionCounter++
        }

        if (optionCounter < 2)
          throw new Error('Недостаточно входных параметров контроллера')
        return controller
      }
    }
  }
}
