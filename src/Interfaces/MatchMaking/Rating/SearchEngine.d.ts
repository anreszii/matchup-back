import type { Rating, Match } from '../../'

export interface MatchFinder {
  filterByRegion(region: Rating.SearchEngine.SUPPORTED_REGIONS): MatchFinder
  filterByGRI(GRI: number): MatchFinder
  filterByTeamSize(size: number): MatchFinder

  delete(): void
  setMaxWaitingTime(ms: number): MatchFinder
  findLobby(): Promise<Match.Lobby.Instance>
}
