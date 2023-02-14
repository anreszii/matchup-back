import type { Match } from '../../../Interfaces'
import { UserModel } from '../../../Models'
import { Logger } from '../../../Utils/Logger'

export class Member implements Match.Player.Instance {
  private _logger = new Logger('Player Manager', '')
  constructor() {}
  init(name: string): Promise<boolean> {
    UserModel.findByName(name)
      .then((user) => {})
      .catch((e) => {
        console.error
      })
  }
}
