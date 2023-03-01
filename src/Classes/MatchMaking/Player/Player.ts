import { Match } from '../../../Interfaces'
import type { DocumentType } from '@typegoose/typegoose'
import { clientServer } from '../../../API/Sockets'
import {
  PlayerData,
  PlayerSignals,
  PlayerStates,
  PrivatePlayerData,
} from '../../../Interfaces/MatchMaking/Player'
import {
  NotificationModel,
  NotificationQueue,
  User,
  UserModel,
} from '../../../Models'
import { Logger } from '../../../Utils/Logger'
import { DTO } from '../../DTO/DTO'
import { TEAMS } from '../Team/Manager'
import { COMMANDS } from '../Command/Manager'
import { MINUTE_IN_MS } from '../../../configs/time_constants'
import { StandOff_Lobbies } from '../Lobby/Manager'
import { TechnicalCause, TechnicalError } from '../../../error'
import { sleep } from '../../../Utils/sleep'

//TODO добавить логику в transition
//TODO добавить сборку мусора по timestamp

export class Player implements Match.Player.Instance {
  private _logger = new Logger('Player', 'Instance')
  private _data!: PrivatePlayerData
  private _timers: Map<PlayerStates, Date> = new Map()
  private _notifications?: DocumentType<NotificationQueue>

  constructor(public name: string) {
    this.event(PlayerSignals.init)
    UserModel.findByName(name)
      .then((document) => {
        if (!document)
          throw new TechnicalError('user document', TechnicalCause.NOT_EXIST)

        NotificationModel.getForUser(document)
          .then((queue) => {
            if (!queue) return
            this._notifications = queue
          })
          .catch((e: Error) => {
            this._logger.warning(
              `[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
            )
          })

        let discordNick = document.profile.discord_nickname
        if (!discordNick) discordNick = document.profile.username
        let nick = document.profile.nickname
        if (!nick) nick = 'undefined'

        this._data.uid = String(document._id)
        this._data.fetchedFromDB = {
          id: String(document._id),
          name: document.profile.username,
          nick,
          discordNick,
          GRI: document.GRI,
          prefix: document.prefix,
          guild: document.guild == undefined ? undefined : `${document.guild}`,
          flags: {
            ready: false,
            searching: false,
          },
          isReady: false,
        }

        this.event(PlayerSignals.be_online)
      })
      .catch((e: Error) => {
        this._logger.critical(
          `[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`,
        )
        throw e
      })
  }

  event(signal: PlayerSignals, data?: { [key: string]: unknown }) {
    switch (signal) {
      case PlayerSignals.delete:
        this.delete()
        break
      case PlayerSignals.init:
        this._data = {} as unknown as PrivatePlayerData
        this._setState(PlayerStates.init)
        break
      case PlayerSignals.be_idle:
        this._setState(PlayerStates.idle)
        this._timers.set(PlayerStates.idle, new Date())
        setTimeout(() => {
          if (this.state == PlayerStates.idle) this.delete()
        }, MINUTE_IN_MS * 2)
        break
      case PlayerSignals.be_online:
        this._setState(PlayerStates.online)
        this.event(PlayerSignals.be_unready)
        break
      case PlayerSignals.search:
        this._setState(PlayerStates.searching)
        break
      case PlayerSignals.join_lobby:
        if (
          !data ||
          typeof data.lobby != 'string' ||
          typeof data.chat != 'string'
        )
          return
        if (this.state >= PlayerStates.waiting) return
        this._setState(PlayerStates.waiting)
        this.PublicData.lobbyID = data.lobby
        this.send(
          'lobby',
          new DTO({ label: 'join', id: data.lobby, chat: data.chat }),
        )
        break
      case PlayerSignals.leave_lobby:
        if (this.state <= PlayerStates.searching) return
        this.send(
          'lobby',
          new DTO({ label: 'leave', id: this.PublicData.lobbyID }),
        )
        this.PublicData.lobbyID = undefined
        this.PublicData.flags.ready = false
        this.event(PlayerSignals.be_unready)
        this._setState(PlayerStates.online)
        break
      case PlayerSignals.be_ready:
        //TODO убрать флаги
        this._setState(PlayerStates.ready)
        this.PublicData.flags.ready = true
        this.PublicData.isReady = true
        break
      case PlayerSignals.be_unready:
        this.PublicData.flags.ready = false
        this.PublicData.isReady = false
        break
      case PlayerSignals.vote:
        this._setState(PlayerStates.voting)
        break
      case PlayerSignals.prepare:
        this._setState(PlayerStates.preparing)
        break
      case PlayerSignals.play:
        this._setState(PlayerStates.playing)
        break
      case PlayerSignals.corrupt:
        const currentData = this.PublicData
        if (currentData.lobbyID) {
          StandOff_Lobbies.get(currentData.lobbyID)?.delete()
          currentData.lobbyID = undefined
        }
        if (currentData.teamID) {
          TEAMS.get(currentData.teamID)?.leave(currentData.name)
          currentData.teamID = undefined
        }
        if (currentData.commandID) {
          COMMANDS.get(currentData.commandID)?.leave(currentData.name)
          currentData.commandID = undefined
        }
        this.event(PlayerSignals.be_online)
    }
  }

  delete(): boolean {
    if (PlayerStates.voting > this.state && this.state > PlayerStates.searching)
      StandOff_Lobbies.get(this.PublicData.lobbyID!)?.leave(
        this.PublicData.name,
      )
    else if (this.state >= PlayerStates.voting)
      StandOff_Lobbies.get(this.PublicData.lobbyID!)?.markToDelete()

    if (this.PublicData.teamID)
      TEAMS.get(this.PublicData.teamID)?.leave(this.PublicData.name)
    this._setState(PlayerStates.deleted)
    return true
  }

  notify(content: string): void {
    this._logger.trace(`creating notify. content: ${content}`)
    if (!this._notifications) return
    this.send(
      'notify',
      new DTO({
        label: 'notify',
        content: content,
      }),
    )
    this._notifications.push(content).catch((e: Error) => {
      this._logger.warning(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
    })
  }

  send(event: string, content: DTO): void {
    if (clientServer.Aliases.isSet(this.PublicData.name))
      clientServer
        .control(clientServer.Aliases.get(this.PublicData.name)!)
        .emit(event, content.to.JSON)
  }

  async waitForState(state: PlayerStates): Promise<void> {
    while (this.state != state) await sleep(5)
  }

  update(): Promise<boolean> {
    this._logger.trace(`Updating data. OLD: ${JSON.stringify(this._data)}`)
    return UserModel.findById(this.id)
      .then((document) => {
        if (!document) {
          this.event(PlayerSignals.corrupt)
          return false
        }
        this._getDataFromDocument(document as unknown as DocumentType<User>)
        this._logger.trace(`Updating data. NEW: ${JSON.stringify(this._data)}`)
        return true
      })
      .catch((e: Error) => {
        this._logger.fatal(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
        this.event(PlayerSignals.delete)
        return false
      })
  }

  isPremium(): Promise<boolean> {
    return UserModel.findById(this.id)
      .then((user) => {
        if (!user) return false
        return user.isPremium()
      })
      .catch((e: Error) => {
        this._logger.fatal(`[ERROR ${e.name}]: ${e.message}; STACK: ${e.stack}`)
        return false
      })
  }

  get id(): Match.Player.ID {
    return this._data.uid
  }

  get state(): PlayerStates {
    return this._data.state
  }

  get PublicData(): PlayerData {
    return this._data.fetchedFromDB
  }

  get readyToDrop(): boolean {
    if (this.state > PlayerStates.online) return false
    return true
  }

  private _getDataFromDocument(document: DocumentType<User>) {
    this.PublicData.nick = document.profile.nickname
    this.PublicData.GRI = document.GRI
    this.PublicData.prefix = document.prefix
    this.PublicData.discordNick = document.profile.discord_nickname
      ? document.profile.discord_nickname
      : document.profile.username
    this.PublicData.guild =
      document.guild == undefined ? undefined : `${document.guild}`
  }

  private _setState(state: PlayerStates) {
    this._data.state = state
  }
}
