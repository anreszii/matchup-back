import { IEntity } from '../Manager'
export interface IMatchMember extends IEntity<string> {
  id: string
  name: string
  isReady: boolean
  GRI: number
  commandID?: number //team id внутри лобби
  teamID?: number //глобальный team id
  lobbyID?: string
  guildName?: string
  prefix?: string
}
