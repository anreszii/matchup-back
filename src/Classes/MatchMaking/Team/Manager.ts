import type { Match } from '../../../Interfaces'
import { Team } from './Team'
import { PLAYERS } from '../Player/Manager'
import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { Logger } from '../../../Utils/Logger'
import { CLIENT_CHATS } from '../../Chat/Manager'
import { v4 as uuid } from 'uuid'

class TeamManager implements Match.Player.Team.Manager {
  private _teams: Map<Match.Player.Team.ID, Match.Player.Team.Instance> =
    new Map()
  private _logger = new Logger('Team Manager')

  constructor() {
    setInterval(
      function (this: TeamManager) {
        this._logger.info('CLEANING GARBAGE')
        for (let team of this._teams.values())
          if (team.readyToDrop) this.drop(team.id)
      }.bind(this),
      MINUTE_IN_MS * 2,
    )
  }

  async spawn(): Promise<Match.Player.Team.Instance> {
    const ID = uuid()
    const team = new Team(ID, await CLIENT_CHATS.spawn('team', `team#${ID}`))

    this._teams.set(ID, team)
    this._logger.info(`SPAWNED TEAM#${team.id}`)
    return team
  }

  drop(ID: Match.Player.Team.ID): boolean {
    if (!this._teams.has(ID)) return false
    const team = this._teams.get(ID)!

    this._logger.info(`DROPPED TEAM#${team.id}`)
    return this._teams.delete(team.id)
  }

  get(ID: Match.Player.Team.ID): Match.Player.Team.Instance | undefined {
    return this._teams.get(ID)
  }

  has(ID: Match.Player.Team.ID): boolean {
    return !this._teams.has(ID)
  }

  findByUserName(name: string): Match.Player.Team.Instance | undefined {
    let player = PLAYERS.get(name)
    if (!player) return

    if (!player.data.teamID) return
    return this.findById(player.data.teamID)
  }

  findById(ID: Match.Player.Team.ID): Match.Player.Team.Instance | undefined {
    return this.get(ID)
  }

  get toArray(): Match.Player.Team.Instance[] {
    return Array.from(this._teams.values())
  }

  get IDs(): Match.Player.Team.ID[] {
    return Array.from(this._teams.keys())
  }
}

/** комманды, сформированные игроками */
export const TEAMS = new TeamManager()
