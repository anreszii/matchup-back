import type { Rating, Match } from '../../'

export interface SearchEngine {
  findLobby(
    filters: Rating.SearchEngine.Filters,
    member: Match.Player.Instance,
  ): Promise<Match.Lobby.Instance>
  get Filters(): Rating.SearchEngine.Filters
}
