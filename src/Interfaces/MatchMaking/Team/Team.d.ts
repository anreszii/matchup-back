import { IEntity, Match } from '../../'

export interface ITeam extends IEntity<number> {
  join(member: Match.Member.Instance): boolean
  leave(member: Match.Member.Instance): boolean
  check(): Array<Match.Member.Instance | undefined>
}
