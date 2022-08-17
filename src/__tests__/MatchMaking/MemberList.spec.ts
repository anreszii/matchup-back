import { UNDEFINED_MEMBER } from '../../configs/match_manager'
import { MemberList } from '../../Classes/MatchMaking/MemberList'
import type { IMember } from '../../Interfaces/MatchMaking'

describe('Member List', () => {
  let list: MemberList
  const TEAM_1: Array<IMember> = [
    {name: 'test', command: 'command1', readyFlag: false, statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test1', command: 'command1', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test2', command: 'command1', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test3', command: 'command1', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test4', command: 'command1', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
  ]

  const TEAM_2: Array<IMember> = [
    {name: 'test5', command: 'command2', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test6', command: 'command2', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test7', command: 'command2', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test8', command: 'command2', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test9', command: 'command2', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
  ]

  const TEAM_NEUTRAL: Array<IMember> = [
    {name: 'test10', command: 'neutral', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test11', command: 'neutral', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test12', command: 'neutral', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test13', command: 'neutral', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test14', command: 'neutral', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
  ]


  const SPECTATORS: Array<IMember> = [
    {name: 'test15', command: 'spectator', readyFlag: false, statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test16', command: 'spectator', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test17', command: 'spectator', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test18', command: 'spectator', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
    {name: 'test19', command: 'spectator', readyFlag: false,statistic: {kills: 0, deaths: 0, assists: 0}},
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

    status = list.add({name:'fake1', command:'command1', readyFlag:false, statistic: {kills:0, deaths: 0, assists: 0}})
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

    status = list.delete({name: 'test511', command: 'neutral', readyFlag: false, statistic: {kills: 0, deaths: 0, assists: 0}})
    expect(status).toBeFalsy()

    status = list.delete(TEAM_1[0], TEAM_1[1], SPECTATORS[0])
    expect(status).toBeTruthy()
    expect(list.quantityOfPlayers).toBe(TEAM_1.length - 2)
    expect(list.quantityOfSpectators).toBe(SPECTATORS.length - 1)
  })

  test('change command', () => {
    let status: boolean
    list.add(...TEAM_NEUTRAL)
    list.add(...TEAM_2)

    status = list.changeCommand(TEAM_NEUTRAL[0], 'command1')
    expect(status).toBeTruthy()

    status = list.changeCommand(TEAM_NEUTRAL[0], 'command2')
    expect(status).toBeFalsy()

    status = list.changeCommand(TEAM_NEUTRAL[0], 'spectator')
    expect(status).toBeTruthy()

    status = list.changeCommand(TEAM_2[0], 'command2')
    expect(status).toBeTruthy()

    list.changeCommand(TEAM_2[0], 'command1')
    status = list.changeCommand(TEAM_NEUTRAL[0], 'command2')
    expect(status).toBeTruthy()

    expect(list.changeCommand('fake', 'spectator')).toBeFalsy()
  })

  test('change status', () => {
    list.add(...TEAM_NEUTRAL)

    list.changeStatus('test10', true)
    expect(list.getMember('test10').readyFlag).toBeTruthy()

    list.changeStatus(TEAM_NEUTRAL[0], false)
    expect(list.getMember('test10').readyFlag).toBeFalsy()

    expect(list.changeStatus('fake', true)).toBeFalsy()
    
    list.getMember(TEAM_NEUTRAL[1]).readyFlag = true
    expect(list.getMember(TEAM_NEUTRAL[1]).readyFlag).toBeTruthy()
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

  test('command check', () => {
    expect(MemberList.isCommand(null)).toBeFalsy()
    expect(MemberList.isCommand(1)).toBeFalsy()
    expect(MemberList.isCommand({})).toBeFalsy()
    expect(MemberList.isCommand({name: 'test'})).toBeFalsy()
    expect(MemberList.isCommand('team1')).toBeFalsy()
    expect(MemberList.isCommand('spectator')).toBeTruthy()
    expect(MemberList.isCommand('command1')).toBeTruthy()
    expect(MemberList.isCommand('command2')).toBeTruthy()
    expect(MemberList.isCommand('neutral')).toBeTruthy()
  })
})