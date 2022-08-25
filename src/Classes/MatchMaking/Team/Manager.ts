import type { Match } from '../../../Interfaces'
import { List } from '../../List'
import { Team } from './Team'

export class TeamManager implements Match.Team.Manager {
  private _teams: List<Match.Team.Instance> = new List()
  public spawn(): Match.Team.Instance {
    let team = new Team(this._teams.freeSpace)
    this._teams.addOne(team)

    return team
  }

  public drop(teamID: number): boolean {
    let team = this._teams.valueOf(teamID)
    if (!team) return true

    return this._teams.delete(team)
  }

  public get(teamID: number): Match.Team.Instance | undefined {
    return this._teams.valueOf(teamID)
  }

  public has(teamID: number): boolean {
    return !this._teams.isUndefined(teamID)
  }
}
