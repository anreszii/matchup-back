import { UNDEFINED_MEMBER } from '../../configs/match_manager'
import { MemberList } from '../../MatchMaking/MemberListl'
import type { Member } from '../../MatchMaking/Lobby'

describe('Member List', () => {
  let pool: MemberList
  const TEAM_1: Array<Member> = [
    {name: 'test', command: 'command1', readyFlag: false},
    {name: 'test1', command: 'command1', readyFlag: false},
    {name: 'test2', command: 'command1', readyFlag: false},
    {name: 'test3', command: 'command1', readyFlag: false},
    {name: 'test4', command: 'command1', readyFlag: false},
  ]

  const TEAM_2: Array<Member> = [
    {name: 'test5', command: 'command2', readyFlag: false},
    {name: 'test6', command: 'command2', readyFlag: false},
    {name: 'test7', command: 'command2', readyFlag: false},
    {name: 'test8', command: 'command2', readyFlag: false},
    {name: 'test9', command: 'command2', readyFlag: false},
  ]

  const TEAM_NEUTRAL: Array<Member> = [
    {name: 'test10', command: 'neutral', readyFlag: false},
    {name: 'test11', command: 'neutral', readyFlag: false},
    {name: 'test12', command: 'neutral', readyFlag: false},
    {name: 'test13', command: 'neutral', readyFlag: false},
    {name: 'test14', command: 'neutral', readyFlag: false},
  ]


  const SPECTATORS: Array<Member> = [
    {name: 'test15', command: 'spectator', readyFlag: false},
    {name: 'test16', command: 'spectator', readyFlag: false},
    {name: 'test17', command: 'spectator', readyFlag: false},
    {name: 'test18', command: 'spectator', readyFlag: false},
    {name: 'test19', command: 'spectator', readyFlag: false},
  ]

  beforeEach(() => {
    pool = new MemberList()
  })
  test('add members', () => {
    let status: boolean
    status = pool.add(...TEAM_1)
    expect(status).toBeTruthy()

    status = pool.add(...TEAM_2)
    expect(status).toBeTruthy()

    status = pool.add(...TEAM_NEUTRAL)
    expect(status).toBeFalsy()

    status = pool.add(...SPECTATORS)
    expect(status).toBeTruthy()

    status = pool.add(...SPECTATORS)
    expect(status).toBeFalsy()
  })

  test('delete members', () => {
    let status: boolean
    pool.add(...TEAM_1)
    pool.add(...SPECTATORS)

    status = pool.delete(UNDEFINED_MEMBER)
    expect(status).toBeFalsy()

    status = pool.delete({name: 'test511', command: 'neutral', readyFlag: false})
    expect(status).toBeFalsy()

    status = pool.delete(TEAM_1[0], TEAM_1[1], SPECTATORS[0])
    expect(status).toBeTruthy()
    expect(pool.quantityOfPlayers).toBe(TEAM_1.length - 2)
    expect(pool.quantityOfSpectators).toBe(SPECTATORS.length - 1)
  })

  test('basic work', () => {
    pool.add(...TEAM_1)
    pool.add(...SPECTATORS)

    expect(pool.quantityOfPlayers).toBe(5)
    expect(pool.quantityOfSpectators).toBe(5)

    expect(pool.spectators).toEqual(SPECTATORS)
    expect(pool.players).toEqual(TEAM_1)
  })
})