import type { Rating, Match } from '../../'

export interface MatchFinder {
  filterByRegion(region: Rating.SearchEngine.SUPPORTED_REGIONS): MatchFinder
  filterByGRI(GRI: number): MatchFinder

  setMaxWaitingTime(ms: number): MatchFinder
  findLobby(): Match.Lobby.Instance
}
