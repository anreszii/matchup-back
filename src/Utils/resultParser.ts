import type { Match } from '../Interfaces/index'

import { MatchListModel, MatchServiceInformation } from '../Models/index'
import { MapScore } from '../Models/MatchMaking/MapScore'
import { MemberRecord } from '../Models/MatchMaking/Member'
import { Statistic } from '../Models/MatchMaking/Statistic'

const enum INDICATORS {
  KILLS = 0,
  DEATHS = 1,
  ASSISTS = 2,
}

export function parseResults(json: string, lobby: string, map: string) {
  const result = new MatchListModel()

  result.game = 'StandOff2'
  result.info = new MatchServiceInformation(lobby)

  const data: { [key: string]: unknown } = JSON.parse(json)

  if (typeof data.score == 'string') {
    result.score = getScoreData(data.score)
    result.score.mapName = map
  }

  if (data.c_ter instanceof Array)
    result.members.push(...getCommandData(data.c_ter, 'command1'))

  if (data.ter instanceof Array)
    result.members.push(...getCommandData(data.ter, 'command2'))

  return result
}

function getScoreData(score: string) {
  const result = new MapScore()

  let scores = score.split(':')

  const ctScore = getNumber(scores[0])
  const tScore = getNumber(scores[1])

  result.command1 = ctScore ? ctScore : 0
  result.command2 = tScore ? tScore : 0

  return result
}

function getCommandData(
  members: Array<{ name: unknown; result: Array<unknown> }>,
  command: Exclude<Match.Lobby.Command.Types, 'neutrals' | 'spectators'>,
) {
  const records = []
  for (let member of members) {
    if (!member.name || typeof member.name != 'string') continue
    let record = new MemberRecord()

    record.name = member.name
    record.command = command

    record.statistic = getMemberStatistic(member.result)
    records.push(record)
  }

  return records
}

function getMemberStatistic(indicators: Array<unknown>) {
  const statistic = new Statistic()
  for (let [indicatorType, indicatorValue] of indicators.entries()) {
    let indicatorAsNum = getNumber(indicatorValue)
    if (!indicatorAsNum) continue

    switch (indicatorType) {
      case INDICATORS.KILLS:
        statistic.kills = indicatorAsNum
        break

      case INDICATORS.DEATHS:
        statistic.deaths = indicatorAsNum
        break

      case INDICATORS.ASSISTS:
        statistic.assists = indicatorAsNum
        break
    }
  }

  return statistic
}

function getNumber(param: unknown) {
  if (!param) return null

  const num = Number(param)
  if (Object.is(NaN, num)) return null

  return num
}
