import type { Match } from '../../../Interfaces'
import { OneTypeArray } from '../../OneTypeArray'
import { Team } from './Team'
import { CHATS } from '../../index'
import { PLAYERS } from '../MemberManager'

class TeamManager implements Match.Member.Team.Manager {
  private _teams: OneTypeArray<Match.Member.Team.Instance> = new OneTypeArray()

  public spawn(): Match.Member.Team.Instance {
    let team = new Team(this._teams.freeSpace)

    this._teams.addOne(team)
    team.chat = this._createChatForTeam(team)

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

  public findByUserName(name: string): Match.Member.Team.Instance | undefined {
    let user = PLAYERS.get(name)
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

  private _createChatForTeam(team: Match.Member.Team.Instance) {
    return CHATS.spawn('gamesocket.io', `team#${team.id}`, {
      namespace: process.env.CLIENT_NAMESPACE!,
      room: `team#${team.id}`,
    })
  }
}

/** комманды, сформированные игроками */
export const TEAMS = new TeamManager()
