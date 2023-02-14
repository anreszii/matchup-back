import type { Match } from '../../../Interfaces'
import { OneTypeArray } from '../../OneTypeArray'
import { Team } from './Team'
import { PLAYERS } from '../MemberManager'
import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { Logger } from '../../../Utils/Logger'

class TeamManager implements Match.Player.Team.Manager {
  private _teams: OneTypeArray<Match.Player.Team.Instance> = new OneTypeArray()
  private _logger = new Logger('Team Manager')

  constructor() {
    setInterval(
      function (this: TeamManager) {
        this._logger.info('CLEANING GARBAGE')
        for (let team of this._teams.toArray)
          if (team.readyToDrop) this.drop(team.id)
      }.bind(this),
      MINUTE_IN_MS * 2,
    )
  }

  public spawn(): Match.Player.Team.Instance {
    let team = new Team(this._teams.freeSpace + 1)

    this._teams.addOne(team)
    this._logger.info(`SPAWNED TEAM#${team.id}`)
    return team
  }

  public drop(teamID: number): boolean {
    let team = this._teams.valueOf(teamID - 1)
    if (!team) return true

    this._logger.info(`DROPPED TEAM#${team.id}`)
    return Boolean(this._teams.delete(team))
  }

  public get(teamID: number): Match.Player.Team.Instance | undefined {
    return this._teams.valueOf(teamID - 1)
  }

  public has(teamID: number): boolean {
    return !this._teams.isUndefined(teamID - 1)
  }

  async findByUserName(name: string) {
    let user = await PLAYERS.get(name)
    if (!user) return

    if (!user.teamID) return
    return this.findById(user.teamID)
  }

  findById(id: number): Match.Player.Team.Instance | undefined {
    return this.get(id)
  }

  public get toArray(): Match.Player.Team.Instance[] {
    return this._teams.toArray
  }

  public get IDs(): number[] {
    let tmp = []
    for (let team of this._teams.toArray) tmp.push(team.id)

    return tmp
  }
}

/** комманды, сформированные игроками */
export const TEAMS = new TeamManager()
