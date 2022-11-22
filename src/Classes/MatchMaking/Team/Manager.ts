import type { Match } from '../../../Interfaces'
import { OneTypeArray } from '../../OneTypeArray'
import { Team } from './Team'
import { PLAYERS } from '../MemberManager'
import { MINUTE_IN_MS } from '../../../configs/time_constants'

class TeamManager implements Match.Member.Team.Manager {
  private _teams: OneTypeArray<Match.Member.Team.Instance> = new OneTypeArray()

  constructor() {
    setInterval(
      function (this: TeamManager) {
        for (let team of this._teams.toArray)
          if (team.readyToDrop) this.drop(team.id)
      }.bind(this),
      MINUTE_IN_MS * 2,
    )
  }

  public spawn(): Match.Member.Team.Instance {
    let team = new Team(this._teams.freeSpace)

    this._teams.addOne(team)
    return team
  }

  public drop(teamID: number): boolean {
    let team = this._teams.valueOf(teamID)
    if (!team) return true

    return Boolean(this._teams.delete(team))
  }

  public get(teamID: number): Match.Member.Team.Instance | undefined {
    return this._teams.valueOf(teamID)
  }

  public has(teamID: number): boolean {
    return !this._teams.isUndefined(teamID)
  }

  async findByUserName(name: string) {
    let user = await PLAYERS.get(name)
    if (!user) return

    if (!user.teamID) return
    return this.findById(user.teamID)
  }

  findById(id: number): Match.Member.Team.Instance | undefined {
    return this.get(id)
  }

  public get toArray(): Match.Member.Team.Instance[] {
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
