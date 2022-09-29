import type { Match } from '../../../Interfaces'
import { List } from '../../List'
import { Team } from './Team'
import { ChatManager } from '../../index'

export class TeamManager implements Match.Team.Manager {
  private static _chats = new ChatManager()
  private _teams: List<Match.Team.Instance> = new List()
  public spawn(): Match.Team.Instance {
    let team = new Team(this._teams.freeSpace)
    this._teams.addOne(team)
    team.chat = this._createChatForTeam(team)

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

  public findByUserName(username: string): Match.Team.Instance | undefined {
    for (let team of this._teams.values()) {
      if (!team) continue
      for (let member of team.check()) {
        if (member.name == username) return team
      }
    }
  }

  private _createChatForTeam(team: Match.Team.Instance) {
    return TeamManager._chats.spawn('gamesocket.io', `team#${team.id}`, {
      namespace: process.env.CLIENT_NAMESPACE!,
      room: `team#${team.id}`,
    })
  }
}
