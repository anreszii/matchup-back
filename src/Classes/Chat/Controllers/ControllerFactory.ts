import type { Chat } from '../../../Interfaces'
import * as list from './controllerList'

export class Factory implements Chat.Controller.Factory.Interface {
  static create(
    controllerName: 'gamesocket.io',
    options?: { [key: string]: string },
  ) {
    let controller: Chat.Controller.Interface
    let optionCounter = 0
    switch (controllerName) {
      case 'gamesocket.io': {
        //считывает, сколько опций не хватило для корректной работы контроллера
        controller = new list.Gamesocket()
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
