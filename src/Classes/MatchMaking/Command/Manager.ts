import type { Match } from '../../../Interfaces'
import { OneTypeArray } from '../../OneTypeArray'
import { Command } from './Command'
import { CHATS } from '../../Chat/Manager'
import { PLAYERS } from '../MemberManager'
import { StandOffLobbies } from '../../../API/Sockets/Controllers/index'
import { TEAMS } from '../index'

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

  async move(
    name: string,
    from: number | Match.Lobby.Command.Instance,
    to: number | Match.Lobby.Command.Instance,
  ): Promise<boolean> {
    let fromCommand: Match.Lobby.Command.Instance | undefined
    let toCommand: Match.Lobby.Command.Instance | undefined
    let team: Match.Member.Team.Instance | undefined

    if (!PLAYERS.has(name)) return false
    let member = await PLAYERS.get(name)
    if (member.teamID) team = TEAMS.get(member.teamID)
    if (!team) {
      member.teamID = undefined
      return false
    }

    if (team.captainName != name) return false

    if (typeof from == 'number') fromCommand = this.get(from)
    else fromCommand = from
    if (typeof to == 'number') toCommand = this.get(to)
    else toCommand = to

    if (!fromCommand || !toCommand || fromCommand.type == toCommand.type)
      return false
    if (fromCommand.lobbyID != toCommand.lobbyID) return false
    if (!fromCommand.has(name)) return false

    let lobby = StandOffLobbies.get(fromCommand.lobbyID)
    if (!lobby || lobby.type == 'rating') return false

    if (fromCommand.isOneTeam || toCommand.isOneTeam) return false
    if (!toCommand.hasSpaceFor(1)) return false

    if (!(await fromCommand.leave(name))) return false
    if (!(await toCommand.join(name))) return false

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

  async findByUserName(name: string) {
    let user = await PLAYERS.get(name)
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
