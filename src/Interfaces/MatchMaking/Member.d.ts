import { IEntity } from '../Manager'
export interface IMatchMember extends IEntity<string> {
  id: string
  name: string
  nick: string
  isReady: boolean
  GRI: number
  discordNick: string
  commandID?: number //team id внутри лобби
  teamID?: number //глобальный team id
  lobbyID?: string
  guildName?: string
  prefix?: string
}
