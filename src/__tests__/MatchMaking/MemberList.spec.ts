import { UNDEFINED_MEMBER } from '../../configs/match_manager'
import { MemberList } from '../../MatchMaking/MemberListl'
import type { Member } from '../../MatchMaking/Lobby'

describe('Member List', () => {
  let list: MemberList
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
    list = new MemberList()
  })
  test('add members', () => {
    let status: boolean
    status = list.add(...TEAM_1)
    expect(status).toBeTruthy()

    status = list.add(...TEAM_1)
    expect(status).toBeFalsy()

    status = list.add(TEAM_1[0])
    expect(status).toBeFalsy()

    status = list.add({name:'fake1', command:'command1', readyFlag:false})
    expect(status).toBeFalsy()

    status = list.add(...TEAM_2)
    expect(status).toBeTruthy()

    status = list.add(...TEAM_NEUTRAL)
    expect(status).toBeFalsy()

    status = list.add(...SPECTATORS)
    expect(status).toBeTruthy()

    status = list.add(...SPECTATORS)
    expect(status).toBeFalsy()
  })

  test('delete members', () => {
    let status: boolean
    list.add(...TEAM_1)
    list.add(...SPECTATORS)

    status = list.delete(UNDEFINED_MEMBER)
    expect(status).toBeFalsy()

    status = list.delete({name: 'test511', command: 'neutral', readyFlag: false})
    expect(status).toBeFalsy()

    status = list.delete(TEAM_1[0], TEAM_1[1], SPECTATORS[0])
    expect(status).toBeTruthy()
    expect(list.quantityOfPlayers).toBe(TEAM_1.length - 2)
    expect(list.quantityOfSpectators).toBe(SPECTATORS.length - 1)
  })

  test('get member', () => {
    let status: boolean
    list.add(...TEAM_1)

    expect(list.getMember(TEAM_1[0])).toBe(TEAM_1[0])
    expect(list.getMember(TEAM_2[0])).toBe(UNDEFINED_MEMBER)
  })

  test('basic work', () => {
    list.add(...TEAM_1)
    list.add(...SPECTATORS)

    expect(list.quantityOfPlayers).toBe(5)
    expect(list.quantityOfSpectators).toBe(5)

    expect(list.spectators).toEqual(SPECTATORS)
    expect(list.players).toEqual(TEAM_1)

  })

  test('member object check', () => {
    expect(MemberList.isMember(null)).toBeFalsy()
    expect(MemberList.isMember(1)).toBeFalsy()
    expect(MemberList.isMember({})).toBeFalsy()
    expect(MemberList.isMember({name: 'test'})).toBeFalsy()
    expect(MemberList.isMember(TEAM_1)).toBeFalsy()
    expect(MemberList.isMember(TEAM_1[0])).toBeTruthy()
  })
})