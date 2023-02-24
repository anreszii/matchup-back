import type { Match, IChat } from '../../../Interfaces'
import { Name } from '../../../Interfaces/MatchMaking/Player'
import { Logger } from '../../../Utils/Logger'
import { getMedian } from '../../../Utils/math'
import { PLAYERS } from '../Player/Manager'

export class Team implements Match.Player.Team.Instance {
  private _players: Map<Name, Match.Player.Instance> = new Map()
  private _captain!: string
  private _maxTeamSize = 5
  private _keyGuild?: string
  private _deleted = false
  private _min: Match.Player.Instance | null = null
  private _max: Match.Player.Instance | null = null
  private _logger: Logger

  constructor(
    private _id: Match.Player.Team.ID,
    private _chat: IChat.Controller,
  ) {
    this._logger = new Logger(`TEAM#${_id}`)
  }

  join(name: string): boolean {
    if (this.players.size >= 5) return false

    this._logger.info(`${name} JOINS`)

    let player = PLAYERS.get(name)
    if (!player) return false
    if (!this._players.set(player.PublicData.name, player)) return false

    this.chat.join(name)
    this._checkGuildAfterJoin(player.PublicData)

    if (!this._captain) this._captain = player.PublicData.name
    player.PublicData.teamID = this.id
    this._updateRatingRecords()
    return true
  }

  leave(name: string): boolean {
    if (this.players.size == 0) return false

    this._logger.info(`${name} LEAVES`)

    let player = this._players.get(name)
    if (!player) return false

    this.chat.leave(name)
    this._checkGuildAfterLeave()

    if (!this.players.delete(name)) return false
    player.PublicData.flags.ready = false
    player.PublicData.teamID = undefined
    if (this._min == player) this._min = null
    if (this._max == player) this._max = null
    this._updateRatingRecords()
    if (this._players.size == 0) return this.delete()
    return true
  }

  delete(): boolean {
    this._logger.info('MARKED TO DELETE')
    this.chat.delete()
    for (let player of this._players.values())
      player.PublicData.teamID = undefined
    this._deleted = true
    return true
  }

  isCaptain(member: string | Match.Player.Instance): boolean {
    let name = typeof member == 'string' ? member : member.PublicData.name
    return name == this._captain
  }

  hasSpaceFor(size: number): boolean {
    return this._maxTeamSize - size > 0
  }

  get id() {
    return this._id
  }

  get GRI(): number {
    const GRIArray: number[] = []
    for (let player of this._players.values())
      GRIArray.push(player.PublicData.GRI)
    return getMedian(...GRIArray)
  }

  get isGuild() {
    return Boolean(this._keyGuild)
  }

  get players() {
    return this._players
  }

  get size(): number {
    return this._players.size
  }

  get playersData(): Match.Player.Data[] {
    const playersData = []
    for (let player of this.players.values())
      playersData.push(player.PublicData)

    return playersData
  }

  set captainName(name: string) {
    this._captain = name
  }

  get captainName() {
    return this._captain
  }

  get chat() {
    return this._chat
  }

  get readyToDrop() {
    return this._deleted
  }

  get maximumRatingSpread(): number {
    if (!this._min || !this._max) return 0
    return this._max!.PublicData.GRI - this._min!.PublicData.GRI
  }

  private _checkGuildAfterJoin(playerData: Match.Player.Data) {
    if (this.size == 0) {
      this._keyGuild = playerData.guild
      return
    }
    if (this._keyGuild != playerData.guild) this._keyGuild = undefined
  }

  private _checkGuildAfterLeave() {
    let players = Array.from(this.players.values())
    this._keyGuild = players[0].PublicData.guild
    for (let i = 1; i < players.length; i++)
      if (players[i].PublicData.guild != this._keyGuild)
        return (this._keyGuild = undefined)
  }

  private _updateRatingRecords() {
    let min, max
    for (let member of this.players.values()) {
      if (!min) min = member
      if (!max) max = member
      if (member.PublicData.GRI < min.PublicData.GRI) this._min = member
      if (member.PublicData.GRI > max.PublicData.GRI) this._max = member
    }
  }
}
