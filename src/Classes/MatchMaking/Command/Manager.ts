import type { Match } from '../../../Interfaces'
import { Command } from './Command'
import { PLAYERS } from '../Player/Manager'
import { StandOff_Lobbies } from '../Lobby/Manager'
import { TEAMS } from '../Team/Manager'
import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { CLIENT_CHATS } from '../../Chat/Manager'
import { Logger } from '../../../Utils/Logger'
import { v4 as uuid } from 'uuid'

class CommandManager implements Match.Lobby.Command.Manager {
  private _logger = new Logger('Command', 'Manager')
  private _commands: Map<Match.Lobby.Command.ID, Match.Lobby.Command.Instance> =
    new Map()

  constructor() {
    setInterval(
      function (this: CommandManager) {
        for (let command of this._commands.values())
          if (command.readyToDrop) this.drop(command.id)
      }.bind(this),
      MINUTE_IN_MS * 2,
    )
  }

  async spawn(
    lobbyID: string,
    type: Match.Lobby.Command.Types,
    maxSize?: number,
  ): Promise<Match.Lobby.Command.Instance> {
    return CLIENT_CHATS.spawn('command', `lobby#${lobbyID}-${type}`)
      .then((chat) => {
        const ID = uuid()
        const command = new Command(ID, lobbyID, type, maxSize, chat)
        this._commands.set(ID, command)

        return command
      })
      .catch((e: Error) => {
        this._logger.fatal(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
        throw e
      })
  }

  move(name: string, to: Match.Lobby.Command.ID): boolean {
    let fromCommand: Match.Lobby.Command.Instance | undefined
    let toCommand: Match.Lobby.Command.Instance | undefined
    let team: Match.Player.Team.Instance | undefined

    if (!PLAYERS.has(name)) return false
    const player = PLAYERS.get(name)!
    if (!player.data.commandID || player.data.commandID == to) return false
    if (player.data.teamID) team = TEAMS.get(player.data.teamID)
    if (!team) {
      player.data.teamID = undefined
      return false
    }
    if (team.captainName != player.data.name) return false

    fromCommand = this.get(player.data.commandID)
    toCommand = this.get(to)

    if (!fromCommand || !toCommand) return false
    if (fromCommand.lobbyID != toCommand.lobbyID) return false

    const lobby = StandOff_Lobbies.get(player.data.lobbyID!)!
    if (lobby.type == 'rating') return false

    if (fromCommand.isOneTeam || toCommand.isOneTeam) return false
    if (!toCommand.hasSpaceFor(1)) return false

    if (!fromCommand.leave(name)) return false
    if (!toCommand.join(name)) return false

    return true
  }

  drop(ID: Match.Lobby.Command.ID): boolean {
    if (!this._commands.has(ID)) return false
    return this._commands.delete(ID)
  }

  get(ID: Match.Lobby.Command.ID) {
    return this._commands.get(ID)
  }

  has(ID: Match.Lobby.Command.ID): boolean {
    return !this._commands.has(ID)
  }

  findByUserName(name: string) {
    if (!PLAYERS.has(name)) return
    const player = PLAYERS.get(name)!

    if (!player.data.commandID) return
    return this.findById(player.data.commandID)
  }

  findById(id: Match.Lobby.Command.ID) {
    return this.get(id)
  }

  get toArray() {
    return Array.from(this._commands.values())
  }

  get IDs(): Match.Lobby.Command.ID[] {
    return Array.from(this._commands.keys())
  }
}

/** комманды, внутри лобби(как террористы и контр-террористы) */
export const COMMANDS = new CommandManager()
