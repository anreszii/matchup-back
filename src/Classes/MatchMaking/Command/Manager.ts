import type { Match } from '../../../Interfaces'
import { OneTypeArray } from '../../OneTypeArray'
import { Command } from './Command'
import { CHATS } from '../../index'
import { PLAYERS } from '../MemberManager'

class CommandManager implements Match.Lobby.Command.Manager {
  private _commands: OneTypeArray<Match.Lobby.Command.Instance> =
    new OneTypeArray()

  spawn(
    lobbyID: string,
    type: Match.Lobby.Command.Types,
    maxSize?: number,
  ): Match.Lobby.Command.Instance {
    let command = new Command(this._commands.freeSpace, lobbyID, type, maxSize)

    this._commands.addOne(command)
    command.chat = this._createChatForCommand(command)

    return command
  }

  move(name: string, to: number): boolean {
    let player = PLAYERS.get(name)
    if (!player || !player.commandID) return false

    let fromCommand = this.get(player.commandID)
    let toCommand = this.get(to)

    if (!fromCommand || !toCommand || fromCommand.id == to) return false
    if (fromCommand.lobbyID != toCommand.lobbyID) return false
    if (!toCommand.hasSpaceFor(1)) return false

    fromCommand.leave(player.name)
    toCommand.join(player.name)

    return true
  }

  drop(ID: number) {
    let command = this._commands.valueOf(ID)
    if (!command) return true

    return Boolean(this._commands.delete(command))
  }

  get(ID: number) {
    return this._commands.valueOf(ID)
  }

  has(teamID: number): boolean {
    return !this._commands.isUndefined(teamID)
  }

  findByUserName(name: string) {
    let user = PLAYERS.get(name)
    if (!user) return

    if (!user.commandID) return
    return this.findById(user.commandID)
  }

  findById(id: number) {
    return this.get(id)
  }

  get toArray() {
    return this._commands.toArray
  }

  get IDs(): number[] {
    let tmp = []
    for (let command of this._commands.toArray) tmp.push(command.id)

    return tmp
  }

  private _createChatForCommand(command: Match.Lobby.Command.Instance) {
    return CHATS.spawn('gamesocket.io', `command#${command.id}`, {
      namespace: process.env.CLIENT_NAMESPACE!,
      room: `command#${command.id}`,
    })
  }
}

/** комманды, внутри лобби(как террористы и контр-террористы) */
export const COMMANDS = new CommandManager()
