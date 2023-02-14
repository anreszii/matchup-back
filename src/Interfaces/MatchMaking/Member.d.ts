import { IEntity } from '../Manager'
export interface IMatchPlayer extends IEntity<string> {
  state: 'offline' | 'idle' | 'online' | 'searching' | 'ready' | 'playing'
  data: {
    id: string
    name: string
    nick: string
    GRI: number
    discordNick: string
    commandID?: number
    teamID?: number
    lobbyID?: string
    guildName?: string
    prefix?: string
  }

  init(name: string): Promise<boolean>
  notify(content): void
}
